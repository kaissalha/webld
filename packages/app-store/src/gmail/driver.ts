import { gmail, type gmail_v1, auth as gmailAuth } from "@googleapis/gmail";
import { createMimeMessage } from "mimetext";

import { logger } from "@starter/logger/server";

import { OAuthTokenRevokedError } from "../types";
import { gmailConfig } from "./config";
import { GMAIL_BATCH_MODIFY_MAX_MESSAGE_IDS, runGmailRequest } from "./gmail-api-limits";
import type { EmailAttachment, EmailSender, ParsedMessage, ThreadResponse } from "./types";

// ============================================================================
// Gmail Driver Configuration
// ============================================================================

export type GmailDriverConfig = {
	accessToken: string;
	refreshToken: string;
	email: string;
};

// ============================================================================
// Utility Functions
// ============================================================================

const fromBase64Url = (str: string) => {
	const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
	const padding = base64.length % 4;
	const paddedBase64 = padding ? base64 + "=".repeat(4 - padding) : base64;
	return Buffer.from(paddedBase64, "base64").toString("utf-8");
};

const findHtmlBody = (parts: gmail_v1.Schema$MessagePart[]): string => {
	for (const part of parts) {
		if (part.mimeType === "text/html" && part.body?.data) {
			return part.body.data;
		}
		if (part.parts) {
			const found = findHtmlBody(part.parts);
			if (found) return found;
		}
	}
	return "";
};

const findPlainTextBody = (parts: gmail_v1.Schema$MessagePart[]): string => {
	for (const part of parts) {
		if (part.mimeType === "text/plain" && part.body?.data) {
			return part.body.data;
		}
		if (part.parts) {
			const found = findPlainTextBody(part.parts);
			if (found) return found;
		}
	}
	return "";
};

const parseAddressList = (value: string | undefined | null): EmailSender[] => {
	if (!value) return [];

	const addresses: EmailSender[] = [];
	const regex = /(?:"([^"]+)"\s*)?<?([^<>,\s]+@[^<>,\s]+)>?/g;
	let match = regex.exec(value);

	while (match !== null) {
		const name = match[1]?.trim();
		const email = match[2]?.trim();
		if (email) {
			addresses.push({ name, email });
		}
		match = regex.exec(value);
	}

	return addresses;
};

const parseFrom = (value: string | undefined | null): EmailSender => {
	const addresses = parseAddressList(value);
	return addresses[0] ?? { email: "" };
};

const getHeader = (headers: gmail_v1.Schema$MessagePartHeader[], name: string) => {
	return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? undefined;
};

// ============================================================================
// Gmail Driver Class
// ============================================================================

export class GmailDriver {
	private auth: InstanceType<typeof gmailAuth.OAuth2>;
	private email: string;
	private gmail: gmail_v1.Gmail;

	constructor(config: GmailDriverConfig) {
		this.auth = new gmailAuth.OAuth2(gmailConfig.clientId, gmailConfig.clientSecret);
		this.email = config.email;

		this.auth.setCredentials({
			access_token: config.accessToken,
			refresh_token: config.refreshToken,
		});

		this.gmail = gmail({ version: "v1", auth: this.auth });
	}

	private async runRequest<T>({ operation, operationName }: { operation: () => Promise<T>; operationName: string }) {
		return runGmailRequest({
			mailboxKey: this.email,
			operation,
			operationName,
		});
	}

	// ============================================================================
	// Token Management
	// ============================================================================

	async refreshAccessToken() {
		try {
			const { credentials } = await this.auth.refreshAccessToken();

			if (!credentials.access_token || !credentials.expiry_date) {
				throw new Error("Failed to refresh access token");
			}

			return {
				accessToken: credentials.access_token,
				expiresAt: new Date(credentials.expiry_date),
			};
		} catch (error) {
			// Check for invalid_grant error - this means the token has been permanently revoked
			const oauthError = error as { message?: string; code?: string };
			if (oauthError.message?.includes("invalid_grant") || oauthError.code === "invalid_grant") {
				throw new OAuthTokenRevokedError(
					"Gmail access has been revoked. Please reconnect your account.",
					"gmail"
				);
			}
			throw error;
		}
	}

	// ============================================================================
	// Thread Operations
	// ============================================================================

	async listThreads({
		folder,
		query,
		maxResults = 50,
		pageToken,
	}: {
		folder?: string;
		query?: string;
		maxResults?: number;
		pageToken?: string;
	}) {
		const labelIds: string[] = [];
		if (folder && folder !== "all") {
			const folderLabel = folder.toUpperCase();
			if (folderLabel === "INBOX" || folderLabel === "SENT" || folderLabel === "DRAFT") {
				labelIds.push(folderLabel);
			}
		}

		let q = query ?? "";
		if (folder === "archive") {
			q = q ? `${q} -in:inbox -in:spam -in:trash` : "-in:inbox -in:spam -in:trash";
		} else if (folder === "spam") {
			q = q ? `${q} in:spam` : "in:spam";
		} else if (folder === "trash") {
			q = q ? `${q} in:trash` : "in:trash";
		}

		try {
			const res = await this.runRequest({
				operationName: "gmail.threads.list",
				operation: () =>
					this.gmail.users.threads.list({
						userId: "me",
						q: q || undefined,
						labelIds: labelIds.length > 0 ? labelIds : undefined,
						maxResults,
						pageToken,
					}),
			});

			const threads = res.data.threads ?? [];

			const filteredThreads = threads.filter(
				(thread): thread is gmail_v1.Schema$Thread & { id: string } => typeof thread.id === "string"
			);

			// Fetch previews for all threads in parallel
			const previews = await Promise.all(
				filteredThreads.map(async (thread) => {
					try {
						return await this.getThreadPreview(thread.id);
					} catch {
						return {
							id: thread.id,
							subject: "(Unable to load)",
							snippet: thread.snippet ?? "",
							sender: { email: "" } as EmailSender,
							receivedOn: new Date().toISOString(),
							isUnread: false,
							isStarred: false,
							labelIds: [] as string[],
							messageIds: [] as string[],
							messageCount: 1,
						};
					}
				})
			);

			return {
				threads: previews,
				nextPageToken: res.data.nextPageToken ?? null,
			};
		} catch (error: unknown) {
			const gmailError = error as { code?: number; message?: string; errors?: unknown[] };
			logger.error({
				error,
				message: "Failed to list Gmail threads",
				metadata: {
					code: gmailError.code,
					message: gmailError.message,
					errors: gmailError.errors,
					folder,
					query,
				},
			});
			throw error;
		}
	}

	async getThreadPreview(threadId: string) {
		const res = await this.runRequest({
			operationName: "gmail.threads.getPreview",
			operation: () =>
				this.gmail.users.threads.get({
					userId: "me",
					id: threadId,
					format: "metadata",
					metadataHeaders: ["Subject", "From", "Date"],
				}),
		});

		const messages = res.data.messages ?? [];
		const lastMessage = messages[messages.length - 1];
		const headers = lastMessage?.payload?.headers ?? [];

		const getHeaderValue = (name: string) =>
			headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? undefined;

		const labelIds = lastMessage?.labelIds ?? [];
		const messageIds = messages.map((message) => message.id).filter((id): id is string => Boolean(id));

		return {
			id: threadId,
			subject: getHeaderValue("Subject") ?? "(No Subject)",
			snippet: res.data.snippet ?? "",
			sender: parseFrom(getHeaderValue("From")),
			receivedOn: getHeaderValue("Date") ?? new Date().toISOString(),
			isUnread: labelIds.includes("UNREAD"),
			isStarred: labelIds.includes("STARRED"),
			labelIds,
			messageIds,
			messageCount: messages.length,
		};
	}

	async getThread(threadId: string): Promise<ThreadResponse> {
		const res = await this.runRequest({
			operationName: "gmail.threads.get",
			operation: () =>
				this.gmail.users.threads.get({
					userId: "me",
					id: threadId,
					format: "full",
				}),
		});

		if (!res.data.messages) {
			return {
				messages: [],
				latest: undefined,
				hasUnread: false,
				totalReplies: 0,
				labels: [],
			};
		}

		let hasUnread = false;
		const labelSet = new Set<string>();

		const messages: ParsedMessage[] = res.data.messages.map((message) => {
			const parsed = this.parseMessage(message);
			for (const labelId of parsed.labelIds) {
				labelSet.add(labelId);
			}
			if (parsed.isUnread) hasUnread = true;
			return parsed;
		});

		const latest = messages.findLast((m) => !m.isDraft);

		return {
			messages,
			latest,
			hasUnread,
			totalReplies: messages.filter((m) => !m.isDraft).length,
			labels: Array.from(labelSet).map((id) => ({ id, name: id })),
		};
	}

	async getThreadMetadata(threadId: string) {
		const res = await this.runRequest({
			operationName: "gmail.threads.getMetadata",
			operation: () =>
				this.gmail.users.threads.get({
					userId: "me",
					id: threadId,
					format: "metadata",
					metadataHeaders: [],
				}),
		});

		return res.data;
	}

	// ============================================================================
	// Message Parsing
	// ============================================================================

	parseMessage(message: gmail_v1.Schema$Message): ParsedMessage {
		const headers = message.payload?.headers ?? [];

		let bodyData = "";
		if (message.payload?.body?.data) {
			bodyData = message.payload.body.data;
		} else if (message.payload?.parts) {
			bodyData = findHtmlBody(message.payload.parts) || findPlainTextBody(message.payload.parts);
		}

		const decodedBody = bodyData ? fromBase64Url(bodyData) : "";
		const labelIds = message.labelIds ?? [];

		const attachments: EmailAttachment[] = [];
		if (message.payload?.parts) {
			this.findAttachments(message.payload.parts, attachments);
		}

		return {
			id: message.id ?? "",
			threadId: message.threadId ?? undefined,
			subject: getHeader(headers, "Subject") ?? "(No Subject)",
			snippet: message.snippet ?? undefined,
			sender: parseFrom(getHeader(headers, "From")),
			to: parseAddressList(getHeader(headers, "To")),
			cc: parseAddressList(getHeader(headers, "Cc")) || null,
			bcc: parseAddressList(getHeader(headers, "Bcc")) || null,
			replyTo: getHeader(headers, "Reply-To"),
			receivedOn: getHeader(headers, "Date") ?? new Date().toISOString(),
			labelIds,
			isUnread: labelIds.includes("UNREAD"),
			isStarred: labelIds.includes("STARRED"),
			isDraft: labelIds.includes("DRAFT"),
			body: decodedBody,
			decodedBody,
			attachments: attachments.length > 0 ? attachments : undefined,
			messageId: getHeader(headers, "Message-ID"),
			inReplyTo: getHeader(headers, "In-Reply-To"),
			references: getHeader(headers, "References"),
		};
	}

	private findAttachments(parts: gmail_v1.Schema$MessagePart[], attachments: EmailAttachment[]) {
		for (const part of parts) {
			const contentDisposition = part.headers?.find(
				(h) => h.name?.toLowerCase() === "content-disposition"
			)?.value;

			if (
				part.filename &&
				part.body?.attachmentId &&
				(!contentDisposition || !contentDisposition.includes("inline"))
			) {
				attachments.push({
					attachmentId: part.body.attachmentId,
					filename: part.filename,
					mimeType: part.mimeType ?? "application/octet-stream",
					size: part.body.size ?? 0,
				});
			}

			if (part.parts) {
				this.findAttachments(part.parts, attachments);
			}
		}
	}

	async getAttachment(messageId: string, attachmentId: string) {
		const res = await this.runRequest({
			operationName: "gmail.messages.attachments.get",
			operation: () =>
				this.gmail.users.messages.attachments.get({
					userId: "me",
					messageId,
					id: attachmentId,
				}),
		});

		return res.data;
	}

	// ============================================================================
	// Label Operations
	// ============================================================================

	async markAsRead(threadIds: string[]) {
		const messageIds: string[] = [];

		for (const threadId of threadIds) {
			const thread = await this.getThreadMetadata(threadId);
			const unreadIds = thread.messages
				?.filter((m) => m.labelIds?.includes("UNREAD"))
				.map((m) => m.id)
				.filter((id): id is string => !!id);
			if (unreadIds) messageIds.push(...unreadIds);
		}

		if (messageIds.length > 0) {
			await this.setMessageLabels({
				messageIds,
				removeLabelIds: ["UNREAD"],
			});
		}
	}

	async markAsUnread(threadIds: string[]) {
		const messageIds: string[] = [];

		for (const threadId of threadIds) {
			const thread = await this.getThreadMetadata(threadId);
			const readIds = thread.messages
				?.filter((m) => !m.labelIds?.includes("UNREAD"))
				.map((m) => m.id)
				.filter((id): id is string => !!id);
			if (readIds) messageIds.push(...readIds);
		}

		if (messageIds.length > 0) {
			await this.setMessageLabels({
				addLabelIds: ["UNREAD"],
				messageIds,
			});
		}
	}

	async star(threadIds: string[]) {
		await Promise.all(
			threadIds.map((id) =>
				this.runRequest({
					operationName: "gmail.threads.modify.star",
					operation: () =>
						this.gmail.users.threads.modify({
							userId: "me",
							id,
							requestBody: { addLabelIds: ["STARRED"] },
						}),
				})
			)
		);
	}

	async unstar(threadIds: string[]) {
		await Promise.all(
			threadIds.map((id) =>
				this.runRequest({
					operationName: "gmail.threads.modify.unstar",
					operation: () =>
						this.gmail.users.threads.modify({
							userId: "me",
							id,
							requestBody: { removeLabelIds: ["STARRED"] },
						}),
				})
			)
		);
	}

	async archive(threadIds: string[]) {
		await Promise.all(
			threadIds.map((id) =>
				this.runRequest({
					operationName: "gmail.threads.modify.archive",
					operation: () =>
						this.gmail.users.threads.modify({
							userId: "me",
							id,
							requestBody: { removeLabelIds: ["INBOX"] },
						}),
				})
			)
		);
	}

	async moveToInbox(threadIds: string[]) {
		await Promise.all(
			threadIds.map((id) =>
				this.runRequest({
					operationName: "gmail.threads.modify.moveToInbox",
					operation: () =>
						this.gmail.users.threads.modify({
							userId: "me",
							id,
							requestBody: { addLabelIds: ["INBOX"] },
						}),
				})
			)
		);
	}

	async trash(threadIds: string[]) {
		await Promise.all(
			threadIds.map((id) =>
				this.runRequest({
					operationName: "gmail.threads.trash",
					operation: () => this.gmail.users.threads.trash({ userId: "me", id }),
				})
			)
		);
	}

	async untrash(threadIds: string[]) {
		await Promise.all(
			threadIds.map((id) =>
				this.runRequest({
					operationName: "gmail.threads.untrash",
					operation: () => this.gmail.users.threads.untrash({ userId: "me", id }),
				})
			)
		);
	}

	async permanentlyDelete(threadId: string) {
		await this.runRequest({
			operationName: "gmail.threads.delete",
			operation: () => this.gmail.users.threads.delete({ userId: "me", id: threadId }),
		});
	}

	// ============================================================================
	// Labels
	// ============================================================================

	async getUserLabels() {
		const res = await this.runRequest({
			operationName: "gmail.labels.list",
			operation: () => this.gmail.users.labels.list({ userId: "me" }),
		});
		return res.data.labels ?? [];
	}

	async createUserLabel({
		backgroundColor,
		name,
		textColor,
	}: {
		backgroundColor?: string;
		name: string;
		textColor?: string;
	}) {
		const res = await this.runRequest({
			operationName: "gmail.labels.create",
			operation: () =>
				this.gmail.users.labels.create({
					userId: "me",
					requestBody: {
						color:
							backgroundColor && textColor
								? {
										backgroundColor,
										textColor,
									}
								: undefined,
						labelListVisibility: "labelShow",
						messageListVisibility: "show",
						name,
					},
				}),
		});

		return res.data;
	}

	async setMessageLabels({
		addLabelIds,
		messageIds,
		removeLabelIds,
	}: {
		addLabelIds?: string[];
		messageIds: string[];
		removeLabelIds?: string[];
	}) {
		const nextAddLabelIds = addLabelIds?.filter(Boolean);
		const nextRemoveLabelIds = removeLabelIds?.filter(Boolean);
		const nextMessageIds = Array.from(new Set(messageIds.filter(Boolean)));

		if (!nextMessageIds.length || (!nextAddLabelIds?.length && !nextRemoveLabelIds?.length)) {
			return;
		}

		for (
			let messageIndex = 0;
			messageIndex < nextMessageIds.length;
			messageIndex += GMAIL_BATCH_MODIFY_MAX_MESSAGE_IDS
		) {
			const currentMessageIds = nextMessageIds.slice(
				messageIndex,
				messageIndex + GMAIL_BATCH_MODIFY_MAX_MESSAGE_IDS
			);
			const requestBody: gmail_v1.Schema$BatchModifyMessagesRequest = {
				ids: currentMessageIds,
			};

			if (nextAddLabelIds?.length) {
				requestBody.addLabelIds = nextAddLabelIds;
			}

			if (nextRemoveLabelIds?.length) {
				requestBody.removeLabelIds = nextRemoveLabelIds;
			}

			await this.runRequest({
				operationName: "gmail.messages.batchModify",
				operation: () =>
					this.gmail.users.messages.batchModify({
						userId: "me",
						requestBody,
					}),
			});
		}
	}

	async setThreadLabels({
		addLabelIds,
		removeLabelIds,
		threadIds,
	}: {
		addLabelIds?: string[];
		removeLabelIds?: string[];
		threadIds: string[];
	}) {
		const nextAddLabelIds = addLabelIds?.filter(Boolean);
		const nextRemoveLabelIds = removeLabelIds?.filter(Boolean);

		await Promise.all(
			threadIds.map((id) =>
				this.runRequest({
					operationName: "gmail.threads.modify.labels",
					operation: () =>
						this.gmail.users.threads.modify({
							userId: "me",
							id,
							requestBody: {
								addLabelIds: nextAddLabelIds?.length ? nextAddLabelIds : undefined,
								removeLabelIds: nextRemoveLabelIds?.length ? nextRemoveLabelIds : undefined,
							},
						}),
				})
			)
		);
	}

	async getLabelCounts() {
		const mainLabels = ["INBOX", "SENT", "DRAFT", "SPAM", "TRASH", "STARRED"];

		const results = await Promise.all(
			mainLabels.map(async (labelId) => {
				try {
					const { data } = await this.runRequest({
						operationName: "gmail.labels.get",
						operation: () => this.gmail.users.labels.get({ userId: "me", id: labelId }),
					});
					const labelName = (data.name ?? data.id ?? "").toLowerCase();
					const isTotalLabel = labelName === "draft" || labelName === "sent";

					return {
						label: labelName === "draft" ? "drafts" : labelName,
						count: Number(isTotalLabel ? data.threadsTotal : data.threadsUnread),
					};
				} catch {
					return null;
				}
			})
		);

		return results.filter((r) => r !== null);
	}

	// ============================================================================
	// Send Email
	// ============================================================================

	async sendEmail({
		to,
		cc,
		bcc,
		subject,
		html,
		threadId,
		inReplyTo,
		references,
	}: {
		to: EmailSender[];
		cc?: EmailSender[];
		bcc?: EmailSender[];
		subject: string;
		html: string;
		threadId?: string;
		inReplyTo?: string;
		references?: string;
	}) {
		const message = createMimeMessage();

		message.setSender({ addr: this.email });
		message.setTo(to.map((recipient) => ({ addr: recipient.email, name: recipient.name })));
		if (cc?.length) {
			message.setCc(cc.map((recipient) => ({ addr: recipient.email, name: recipient.name })));
		}
		if (bcc?.length) {
			message.setBcc(bcc.map((recipient) => ({ addr: recipient.email, name: recipient.name })));
		}
		message.setSubject(subject);
		message.addMessage({
			contentType: "text/html",
			data: html,
		});
		if (inReplyTo) {
			message.setHeader("In-Reply-To", inReplyTo);
		}
		if (references) {
			message.setHeader("References", references);
		}

		const res = await this.runRequest({
			operationName: "gmail.messages.send",
			operation: () =>
				this.gmail.users.messages.send({
					userId: "me",
					requestBody: { raw: message.asEncoded(), threadId },
				}),
		});

		return res.data;
	}

	// ============================================================================
	// User Info
	// ============================================================================

	async getUserProfile() {
		const res = await this.runRequest({
			operationName: "gmail.users.getProfile",
			operation: () => this.gmail.users.getProfile({ userId: "me" }),
		});
		return res.data;
	}
}

// ============================================================================
// Factory Function
// ============================================================================

export const createGmailDriver = (config: GmailDriverConfig) => {
	return new GmailDriver(config);
};
