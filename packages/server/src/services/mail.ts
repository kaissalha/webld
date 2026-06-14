import { Output, generateText } from "ai";
import { and, eq } from "drizzle-orm";

import { models } from "@starter/ai/models";
import { buildMailSearchRewritePrompt, mailSearchRewriteSchema } from "@starter/ai/prompts";
import {
	createGmailDriver,
	type GmailDriver,
	getMailClassificationLabelName,
	MAIL_CLASSIFICATION_LABELS,
	MAIL_CLASSIFICATION_LABEL_DEFINITIONS,
	type MailClassificationLabelName,
	type MailLabelSummary,
	type ThreadPreview,
} from "@starter/app-store";
import { db, type OAuthConnection, oauthConnections } from "@starter/db";
import { logger } from "@starter/logger/server";

import { preprocessEmailHtml } from "./email-preprocessor";
import {
	applyMailClassificationLabels,
	getMailClassificationLabel,
	scheduleMailClassificationLabelWrite,
	serializeMailLabel,
} from "./mail-classification";
import { refreshStoredOAuthAccessToken } from "./oauth-token-refresh";

type MailThreadListItem = Omit<ThreadPreview, "messageIds">;

export type MailThreadListPage = {
	connectionEmail: string;
	connectionId: string;
	nextPageToken: string | null;
	threads: MailThreadListItem[];
};

type MailThreadClassificationPatch = {
	classificationLabel: MailLabelSummary;
	labelIds: string[];
	threadId: string;
};

export type MailThreadListStreamChunk =
	| {
			page: MailThreadListPage;
			type: "threads";
	  }
	| {
			classifications: MailThreadClassificationPatch[];
			type: "classifications";
	  };

const getSerializedMailLabels = async ({ driver }: { driver: GmailDriver }) => {
	const labels = await driver.getUserLabels();

	return labels.flatMap((label): MailLabelSummary[] => {
		const serializedLabel = serializeMailLabel(label);

		return serializedLabel ? [serializedLabel] : [];
	});
};

const getSerializedMailLabelsForList = async ({
	connectionId,
	driver,
	organizationId,
}: {
	connectionId: string;
	driver: GmailDriver;
	organizationId: string;
}) => {
	try {
		return await getSerializedMailLabels({ driver });
	} catch (error) {
		logger.warn({
			error,
			message: "Failed to load Gmail labels for mail thread list",
			metadata: {
				connectionId,
				organizationId,
			},
		});

		return [];
	}
};

const getAppMailClassificationLabel = ({ labelName }: { labelName: MailClassificationLabelName }) => {
	const definition = MAIL_CLASSIFICATION_LABEL_DEFINITIONS[labelName];

	return {
		backgroundColor: definition.backgroundColor,
		id: labelName,
		name: labelName,
		textColor: definition.textColor,
	} satisfies MailLabelSummary;
};

const getExistingMailThreadClassificationLabel = ({
	labels,
	thread,
}: {
	labels: MailLabelSummary[];
	thread: ThreadPreview;
}) => {
	const appLabelName = thread.labelIds.flatMap((labelId): MailClassificationLabelName[] => {
		const labelName = getMailClassificationLabelName(labelId);

		return labelName ? [labelName] : [];
	})[0];

	if (appLabelName) {
		return getAppMailClassificationLabel({ labelName: appLabelName });
	}

	return getMailClassificationLabel({
		labelIds: thread.labelIds,
		labels,
	});
};

const getMailThreadListItem = ({
	classificationLabel,
	thread,
}: {
	classificationLabel: MailLabelSummary | null;
	thread: ThreadPreview;
}) => {
	const item = {
		classificationLabel,
		id: thread.id,
		isStarred: thread.isStarred,
		isUnread: thread.isUnread,
		labelIds: thread.labelIds,
		receivedOn: thread.receivedOn,
		sender: thread.sender,
		snippet: thread.snippet,
		subject: thread.subject,
	} satisfies MailThreadListItem;

	if (!thread.messageCount) {
		return item;
	}

	return {
		...item,
		messageCount: thread.messageCount,
	};
};

const getMailThreadClassificationPatches = ({ threads }: { threads: ThreadPreview[] }) => {
	const appClassificationLabelIds = new Set<string>(MAIL_CLASSIFICATION_LABELS);

	return threads.flatMap((thread): MailThreadClassificationPatch[] => {
		if (!thread.classificationLabel) {
			return [];
		}

		return [
			{
				classificationLabel: thread.classificationLabel,
				labelIds: [
					...thread.labelIds.filter((labelId) => !appClassificationLabelIds.has(labelId)),
					thread.classificationLabel.id,
				],
				threadId: thread.id,
			},
		];
	});
};

export const rewriteMailSearchQuery = async ({ localDate, search }: { localDate: string; search: string }) => {
	const trimmedSearch = search.trim();

	if (!trimmedSearch) {
		return {
			query: "",
		};
	}

	try {
		const { output } = await generateText({
			model: models.fast.model,
			output: Output.object({
				schema: mailSearchRewriteSchema,
			}),
			prompt: buildMailSearchRewritePrompt({ localDate, search: trimmedSearch }),
			temperature: 0,
		});

		return {
			query: output?.query.trim() || trimmedSearch,
		};
	} catch (error) {
		logger.error({
			error,
			message: "Failed to rewrite mail search query",
			metadata: {
				search: trimmedSearch,
			},
		});

		return {
			query: trimmedSearch,
		};
	}
};

// ============================================================================
// Get OAuth Connection
// ============================================================================

export const getMailConnection = async ({
	organizationId,
	connectionId,
	userId,
}: {
	organizationId: string;
	connectionId?: string;
	userId?: string;
}) => {
	if (connectionId) {
		const [connection] = await db
			.select()
			.from(oauthConnections)
			.where(and(eq(oauthConnections.id, connectionId), eq(oauthConnections.organizationId, organizationId)))
			.limit(1);

		return connection;
	}

	// Get the first connected Gmail account for the organization
	const [connection] = await db
		.select()
		.from(oauthConnections)
		.where(
			and(
				eq(oauthConnections.organizationId, organizationId),
				eq(oauthConnections.provider, "gmail"),
				eq(oauthConnections.status, "connected"),
				userId ? eq(oauthConnections.userId, userId) : undefined
			)
		)
		.limit(1);

	return connection;
};

// ============================================================================
// List Mail Connections
// ============================================================================

export const listMailConnections = async ({ organizationId, userId }: { organizationId: string; userId?: string }) => {
	const connections = await db
		.select()
		.from(oauthConnections)
		.where(
			and(
				eq(oauthConnections.organizationId, organizationId),
				eq(oauthConnections.provider, "gmail"),
				userId ? eq(oauthConnections.userId, userId) : undefined
			)
		);

	return connections;
};

// ============================================================================
// Create Gmail Driver from Connection
// ============================================================================

export const createDriverFromConnection = async (connection: OAuthConnection) => {
	// Check if token needs refresh
	const expiresAt = new Date(connection.expiresAt);
	const now = new Date();
	const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

	let accessToken = connection.accessToken;

	if (expiresAt < fiveMinutesFromNow) {
		logger.info({
			message: "Token expired or expiring soon, refreshing",
			metadata: {
				connectionId: connection.id,
			},
		});
		accessToken = await refreshStoredOAuthAccessToken(connection);
		logger.info({
			message: "Token refreshed successfully",
			metadata: {
				connectionId: connection.id,
			},
		});
	} else {
		// Update last accessed timestamp
		await db
			.update(oauthConnections)
			.set({ lastAccessedAt: now.toISOString() })
			.where(eq(oauthConnections.id, connection.id));
	}

	return createGmailDriver({
		accessToken,
		refreshToken: connection.refreshToken,
		email: connection.email,
	});
};

// ============================================================================
// List Threads
// ============================================================================

export const listMailThreads = async function* ({
	organizationId,
	connectionId,
	folder = "inbox",
	query,
	maxResults,
	pageToken,
	classifyUnlabeled = false,
}: {
	classifyUnlabeled?: boolean;
	organizationId: string;
	connectionId?: string;
	folder?: string;
	query?: string;
	maxResults?: number;
	pageToken?: string;
}): AsyncGenerator<MailThreadListStreamChunk> {
	const connection = await getMailConnection({ organizationId, connectionId });

	if (!connection) {
		throw new Error("No mail connection found");
	}

	const driver = await createDriverFromConnection(connection);

	try {
		const labelsPromise = getSerializedMailLabelsForList({
			connectionId: connection.id,
			driver,
			organizationId,
		});
		const result: {
			nextPageToken?: string | null;
			threads: ThreadPreview[];
		} = await driver.listThreads({
			folder,
			maxResults,
			pageToken,
			query,
		});
		const labels = await labelsPromise;
		const threads = result.threads.map((thread) => {
			const classificationLabel =
				thread.classificationLabel ??
				getExistingMailThreadClassificationLabel({
					labels,
					thread,
				});

			return {
				...thread,
				classificationLabel,
			};
		});

		yield {
			page: {
				connectionEmail: connection.email,
				connectionId: connection.id,
				nextPageToken: result.nextPageToken ?? null,
				threads: threads.map((thread) =>
					getMailThreadListItem({
						classificationLabel: thread.classificationLabel ?? null,
						thread,
					})
				),
			},
			type: "threads",
		};

		if (!classifyUnlabeled) {
			return;
		}

		const threadsNeedingClassification = threads.filter((thread) => {
			if (thread.labelIds.includes("DRAFT")) {
				return false;
			}

			if (thread.classificationLabel) {
				return false;
			}

			return true;
		});

		if (!threadsNeedingClassification.length) {
			return;
		}

		const classifiedThreads = await applyMailClassificationLabels({
			applyNativeLabels: false,
			connectionEmail: connection.email,
			driver,
			folder: "inbox",
			threads: threadsNeedingClassification,
		});
		const classifications = getMailThreadClassificationPatches({
			threads: classifiedThreads,
		});

		if (!classifications.length) {
			return;
		}

		yield {
			classifications,
			type: "classifications",
		};

		scheduleMailClassificationLabelWrite({
			driver,
			nextClassifications: new Map(
				classifications.flatMap((classification): Array<[string, MailClassificationLabelName]> => {
					const labelName = getMailClassificationLabelName(classification.classificationLabel.name);

					return labelName ? [[classification.threadId, labelName]] : [];
				})
			),
			threads: threadsNeedingClassification,
		});
	} catch (error) {
		logger.error({
			error,
			message: "Failed to list mail threads",
			metadata: {
				connectionId: connection.id,
				folder,
				query,
				maxResults,
				pageToken,
			},
		});
		throw error;
	}
};

export const readInitialMailThreadListPage = async ({
	stream,
}: {
	stream: AsyncGenerator<MailThreadListStreamChunk>;
}) => {
	for await (const chunk of stream) {
		if (chunk.type === "threads") {
			return chunk.page;
		}
	}

	return null;
};

// ============================================================================
// Get Thread Preview (lightweight metadata for list view)
// ============================================================================

export const getMailThreadPreview = async ({
	organizationId,
	connectionId,
	threadId,
}: {
	organizationId: string;
	connectionId: string;
	threadId: string;
}) => {
	const connection = await getMailConnection({ organizationId, connectionId });

	if (!connection) {
		throw new Error("No mail connection found");
	}

	const driver = await createDriverFromConnection(connection);
	return driver.getThreadPreview(threadId);
};

// ============================================================================
// Get Thread (full content - only when viewing)
// ============================================================================

export const getMailThread = async ({
	organizationId,
	connectionId,
	threadId,
}: {
	organizationId: string;
	connectionId: string;
	threadId: string;
}) => {
	const connection = await getMailConnection({ organizationId, connectionId });

	if (!connection) {
		throw new Error("No mail connection found");
	}

	const driver = await createDriverFromConnection(connection);
	const thread = await driver.getThread(threadId);
	const labels = await getSerializedMailLabels({ driver });

	const preprocessedMessages = thread.messages.map((msg) => {
		if (!msg.decodedBody && !msg.body) return msg;
		const raw = msg.decodedBody || msg.body;
		const { html } = preprocessEmailHtml(raw);
		return { ...msg, decodedBody: html };
	});

	return {
		...thread,
		classificationLabel: thread.latest
			? getMailClassificationLabel({
					labelIds: thread.latest.labelIds,
					labels,
				})
			: null,
		messages: preprocessedMessages,
	};
};

// ============================================================================
// Thread Actions
// ============================================================================

export const markMailAsRead = async ({
	organizationId,
	connectionId,
	threadIds,
}: {
	organizationId: string;
	connectionId: string;
	threadIds: string[];
}) => {
	const connection = await getMailConnection({ organizationId, connectionId });
	if (!connection) throw new Error("No mail connection found");

	const driver = await createDriverFromConnection(connection);
	await driver.markAsRead(threadIds);
};

export const markMailAsUnread = async ({
	organizationId,
	connectionId,
	threadIds,
}: {
	organizationId: string;
	connectionId: string;
	threadIds: string[];
}) => {
	const connection = await getMailConnection({ organizationId, connectionId });
	if (!connection) throw new Error("No mail connection found");

	const driver = await createDriverFromConnection(connection);
	await driver.markAsUnread(threadIds);
};

export const starMail = async ({
	organizationId,
	connectionId,
	threadIds,
}: {
	organizationId: string;
	connectionId: string;
	threadIds: string[];
}) => {
	const connection = await getMailConnection({ organizationId, connectionId });
	if (!connection) throw new Error("No mail connection found");

	const driver = await createDriverFromConnection(connection);
	await driver.star(threadIds);
};

export const unstarMail = async ({
	organizationId,
	connectionId,
	threadIds,
}: {
	organizationId: string;
	connectionId: string;
	threadIds: string[];
}) => {
	const connection = await getMailConnection({ organizationId, connectionId });
	if (!connection) throw new Error("No mail connection found");

	const driver = await createDriverFromConnection(connection);
	await driver.unstar(threadIds);
};

export const archiveMail = async ({
	organizationId,
	connectionId,
	threadIds,
}: {
	organizationId: string;
	connectionId: string;
	threadIds: string[];
}) => {
	const connection = await getMailConnection({ organizationId, connectionId });
	if (!connection) throw new Error("No mail connection found");

	const driver = await createDriverFromConnection(connection);
	await driver.archive(threadIds);
};

export const trashMail = async ({
	organizationId,
	connectionId,
	threadIds,
}: {
	organizationId: string;
	connectionId: string;
	threadIds: string[];
}) => {
	const connection = await getMailConnection({ organizationId, connectionId });
	if (!connection) throw new Error("No mail connection found");

	const driver = await createDriverFromConnection(connection);
	await driver.trash(threadIds);
};

// ============================================================================
// Send Email
// ============================================================================

export const sendMail = async ({
	organizationId,
	connectionId,
	body,
	...emailParams
}: {
	organizationId: string;
	connectionId: string;
	to: { name?: string; email: string }[];
	cc?: { name?: string; email: string }[];
	bcc?: { name?: string; email: string }[];
	subject: string;
	body: string;
	threadId?: string;
	inReplyTo?: string;
	references?: string;
}) => {
	const connection = await getMailConnection({ organizationId, connectionId });
	if (!connection) throw new Error("No mail connection found");

	const driver = await createDriverFromConnection(connection);
	const escapedBody = body
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

	return driver.sendEmail({
		...emailParams,
		html: `<div dir="auto">${escapedBody.replace(/\r\n|\r|\n/g, "<br />")}</div>`,
	});
};

// ============================================================================
// Get Label Counts
// ============================================================================

export const getMailLabelCounts = async ({
	organizationId,
	connectionId,
}: {
	organizationId: string;
	connectionId: string;
}) => {
	const connection = await getMailConnection({ organizationId, connectionId });
	if (!connection) throw new Error("No mail connection found");

	const driver = await createDriverFromConnection(connection);
	return driver.getLabelCounts();
};

// ============================================================================
// Get Attachment
// ============================================================================

export const getMailAttachment = async ({
	organizationId,
	connectionId,
	messageId,
	attachmentId,
}: {
	organizationId: string;
	connectionId: string;
	messageId: string;
	attachmentId: string;
}) => {
	const connection = await getMailConnection({ organizationId, connectionId });
	if (!connection) throw new Error("No mail connection found");

	const driver = await createDriverFromConnection(connection);
	return driver.getAttachment(messageId, attachmentId);
};
