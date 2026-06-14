import type { gmail_v1 } from "@googleapis/gmail";
import { describe, expect, it, vi } from "vitest";

import { OAuthTokenRevokedError } from "../../src/types";

process.env.GOOGLE_CLIENT_ID = "test-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

const refreshAccessToken = vi.fn();
const gmailConstructor = vi.fn();
const setCredentials = vi.fn();

vi.mock("google-auth-library", () => {
	return {
		OAuth2Client: class {
			refreshAccessToken = refreshAccessToken;
			setCredentials = setCredentials;
		},
		GoogleAuth: class {},
	};
});

vi.mock("@googleapis/gmail", () => {
	return {
		gmail: gmailConstructor,
		auth: {
			OAuth2: class {
				refreshAccessToken = refreshAccessToken;
				setCredentials = setCredentials;
			},
		},
	};
});

vi.mock("../../src/gmail/config.ts", () => {
	return {
		gmailConfig: {
			clientId: "client-id",
			clientSecret: "client-secret",
			redirectUri: "https://example.com/callback",
		},
	};
});

type GmailUsers = gmail_v1.Gmail["users"];

const makeGmailClient = (overrides?: Partial<GmailUsers>) => {
	return {
		threads: {
			list: vi.fn(),
			get: vi.fn(),
			modify: vi.fn(),
			trash: vi.fn(),
			untrash: vi.fn(),
			delete: vi.fn(),
		},
		messages: {
			attachments: { get: vi.fn() },
			batchModify: vi.fn(),
			send: vi.fn(),
		},
		labels: {
			create: vi.fn(),
			list: vi.fn(),
			get: vi.fn(),
		},
		getProfile: vi.fn(),
		...overrides,
	};
};

const loadDriver = async () => {
	const module = await import("../../src/gmail/driver");
	return module.GmailDriver;
};

const setupDriver = async () => {
	const users = makeGmailClient();
	gmailConstructor.mockReturnValue({ users });
	const GmailDriver = await loadDriver();
	const driver = new GmailDriver({ accessToken: "token", refreshToken: "refresh", email: "user@example.com" });
	return { driver, users };
};

const toBase64Url = (value: string) =>
	Buffer.from(value).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

describe("GmailDriver", () => {
	it("refreshAccessToken returns new token and expiry", async () => {
		refreshAccessToken.mockResolvedValue({ credentials: { access_token: "next", expiry_date: 1234 } });

		const { driver } = await setupDriver();
		const result = await driver.refreshAccessToken();

		expect(result.accessToken).toBe("next");
		expect(result.expiresAt).toEqual(new Date(1234));
	});

	it("refreshAccessToken throws revoked error on invalid_grant", async () => {
		refreshAccessToken.mockRejectedValue(new Error("invalid_grant"));

		const { driver } = await setupDriver();

		await expect(driver.refreshAccessToken()).rejects.toBeInstanceOf(OAuthTokenRevokedError);
	});

	it("refreshAccessToken throws revoked error on invalid_grant code", async () => {
		const error = new Error("Token error") as Error & { code: string };
		error.code = "invalid_grant";
		refreshAccessToken.mockRejectedValue(error);

		const { driver } = await setupDriver();

		await expect(driver.refreshAccessToken()).rejects.toBeInstanceOf(OAuthTokenRevokedError);
	});

	it("refreshAccessToken throws original error for non-revoked errors", async () => {
		refreshAccessToken.mockRejectedValue(new Error("Network error"));

		const { driver } = await setupDriver();

		await expect(driver.refreshAccessToken()).rejects.toThrow("Network error");
	});

	it("listThreads builds archive query and returns previews", async () => {
		const { driver, users } = await setupDriver();
		users.threads.list = vi.fn().mockResolvedValue({
			data: {
				threads: [{ id: "thread-1", snippet: "Snippet" }],
				nextPageToken: "next",
			},
		});
		users.threads.get = vi.fn().mockResolvedValue({
			data: {
				messages: [
					{
						id: "msg-1",
						labelIds: ["UNREAD"],
						payload: {
							headers: [
								{ name: "Subject", value: "Hello" },
								{ name: "From", value: "Jane <jane@example.com>" },
								{ name: "Date", value: "2024-01-01" },
							],
						},
					},
				],
				snippet: "Snippet",
			},
		});

		const result = await driver.listThreads({ folder: "archive", query: "from:me" });

		expect(users.threads.list).toHaveBeenCalledWith({
			userId: "me",
			q: "from:me -in:inbox -in:spam -in:trash",
			labelIds: undefined,
			maxResults: 50,
			pageToken: undefined,
		});
		expect(result.nextPageToken).toBe("next");
		expect(result.threads[0]?.subject).toBe("Hello");
		expect(result.threads[0]?.sender.email).toBe("jane@example.com");
		expect(result.threads[0]?.isUnread).toBe(true);
		expect(result.threads[0]?.messageIds).toEqual(["msg-1"]);
	});

	it("listThreads includes the inbox label for inbox folder queries", async () => {
		const { driver, users } = await setupDriver();
		users.threads.list = vi.fn().mockResolvedValue({
			data: { threads: [], nextPageToken: null },
		});

		await driver.listThreads({ folder: "inbox" });

		expect(users.threads.list).toHaveBeenCalledWith({
			userId: "me",
			q: undefined,
			labelIds: ["INBOX"],
			maxResults: 50,
			pageToken: undefined,
		});
	});

	it("listThreads handles spam folder query", async () => {
		const { driver, users } = await setupDriver();
		users.threads.list = vi.fn().mockResolvedValue({
			data: { threads: [], nextPageToken: null },
		});

		await driver.listThreads({ folder: "spam" });

		expect(users.threads.list).toHaveBeenCalledWith({
			userId: "me",
			q: "in:spam",
			labelIds: undefined,
			maxResults: 50,
			pageToken: undefined,
		});
	});

	it("listThreads handles trash folder query", async () => {
		const { driver, users } = await setupDriver();
		users.threads.list = vi.fn().mockResolvedValue({
			data: { threads: [], nextPageToken: null },
		});

		await driver.listThreads({ folder: "trash" });

		expect(users.threads.list).toHaveBeenCalledWith({
			userId: "me",
			q: "in:trash",
			labelIds: undefined,
			maxResults: 50,
			pageToken: undefined,
		});
	});

	it("listThreads handles empty threads gracefully", async () => {
		const { driver, users } = await setupDriver();
		users.threads.list = vi.fn().mockResolvedValue({
			data: { threads: null, nextPageToken: null },
		});

		const result = await driver.listThreads({});

		expect(result.threads).toEqual([]);
		expect(result.nextPageToken).toBeNull();
	});

	it("listThreads returns fallback preview when preview fails", async () => {
		const { driver, users } = await setupDriver();
		users.threads.list = vi.fn().mockResolvedValue({
			data: { threads: [{ id: "thread-1", snippet: "Snippet" }], nextPageToken: null },
		});
		users.threads.get = vi.fn().mockRejectedValue(new Error("Preview failure"));

		const result = await driver.listThreads({});

		expect(result.threads[0]?.subject).toBe("(Unable to load)");
	});

	it("sendEmail encodes payload and forwards thread info", async () => {
		const { driver, users } = await setupDriver();
		users.messages.send = vi.fn().mockResolvedValue({ data: { id: "sent" } });

		const result = await driver.sendEmail({
			to: [{ email: "to@example.com", name: "To User" }],
			cc: [{ email: "cc@example.com" }],
			subject: "Hello",
			html: "<p>Body</p>",
			threadId: "thread-1",
			inReplyTo: "reply",
			references: "ref",
		});

		const call = vi.mocked(users.messages.send).mock.calls[0]?.[0];
		const encoded = (call?.requestBody.raw ?? "").replace(/-/g, "+").replace(/_/g, "/");
		const decoded = Buffer.from(encoded, "base64").toString("utf-8");

		expect(decoded).toContain("From: <user@example.com>");
		expect(decoded).toContain("To: =?utf-8?B?VG8gVXNlcg==?= <to@example.com>");
		expect(decoded).toContain("Cc: <cc@example.com>");
		expect(decoded).toContain("Subject: =?utf-8?B?SGVsbG8=?=");
		expect(decoded).toContain("<p>Body</p>");
		expect(call?.requestBody.threadId).toBe("thread-1");
		expect(result).toEqual({ id: "sent" });
	});

	it("sendEmail sends html as provided", async () => {
		const { driver, users } = await setupDriver();
		users.messages.send = vi.fn().mockResolvedValue({ data: { id: "sent" } });

		await driver.sendEmail({
			to: [{ email: "to@example.com" }],
			subject: "Follow-up",
			html: '<div dir="auto">Hi <strong>Anas</strong><br />Line two.</div>',
		});

		const call = vi.mocked(users.messages.send).mock.calls[0]?.[0];
		const encoded = (call?.requestBody.raw ?? "").replace(/-/g, "+").replace(/_/g, "/");
		const decoded = Buffer.from(encoded, "base64").toString("utf-8");

		expect(decoded).toContain('<div dir="auto">Hi <strong>Anas</strong><br />Line two.</div>');
	});

	it("sendEmail includes reply headers when provided", async () => {
		const { driver, users } = await setupDriver();
		users.messages.send = vi.fn().mockResolvedValue({ data: { id: "sent" } });

		await driver.sendEmail({
			to: [{ email: "to@example.com" }],
			subject: "Subject",
			html: "<p>Body</p>",
			inReplyTo: "<reply@example.com>",
			references: "<ref-1@example.com> <ref-2@example.com>",
		});

		const call = vi.mocked(users.messages.send).mock.calls[0]?.[0];
		const encoded = (call?.requestBody.raw ?? "").replace(/-/g, "+").replace(/_/g, "/");
		const decoded = Buffer.from(encoded, "base64").toString("utf-8");

		expect(decoded).toContain("In-Reply-To: <reply@example.com>");
		expect(decoded).toContain("References: <ref-1@example.com> <ref-2@example.com>");
	});

	it("sendEmail handles bcc recipients", async () => {
		const { driver, users } = await setupDriver();
		users.messages.send = vi.fn().mockResolvedValue({ data: { id: "sent" } });

		await driver.sendEmail({
			to: [{ email: "to@example.com" }],
			bcc: [{ email: "bcc@example.com", name: "Secret" }],
			subject: "Test",
			html: "<p>Body</p>",
		});

		const call = vi.mocked(users.messages.send).mock.calls[0]?.[0];
		const encoded = (call?.requestBody.raw ?? "").replace(/-/g, "+").replace(/_/g, "/");
		const decoded = Buffer.from(encoded, "base64").toString("utf-8");

		expect(decoded).toContain("Bcc: =?utf-8?B?U2VjcmV0?= <bcc@example.com>");
	});

	it("markAsRead removes UNREAD label from messages", async () => {
		const { driver, users } = await setupDriver();
		users.threads.get = vi.fn().mockResolvedValue({
			data: {
				messages: [
					{ id: "msg-1", labelIds: ["UNREAD"] },
					{ id: "msg-2", labelIds: ["INBOX"] },
				],
			},
		});
		users.messages.batchModify = vi.fn().mockResolvedValue({});

		await driver.markAsRead(["thread-1"]);

		expect(users.messages.batchModify).toHaveBeenCalledWith({
			userId: "me",
			requestBody: {
				ids: ["msg-1"],
				removeLabelIds: ["UNREAD"],
			},
		});
	});

	it("markAsUnread adds UNREAD label to messages", async () => {
		const { driver, users } = await setupDriver();
		users.threads.get = vi.fn().mockResolvedValue({
			data: {
				messages: [
					{ id: "msg-1", labelIds: ["INBOX"] },
					{ id: "msg-2", labelIds: ["INBOX"] },
				],
			},
		});
		users.messages.batchModify = vi.fn().mockResolvedValue({});

		await driver.markAsUnread(["thread-1"]);

		expect(users.messages.batchModify).toHaveBeenCalledWith({
			userId: "me",
			requestBody: {
				ids: ["msg-1", "msg-2"],
				addLabelIds: ["UNREAD"],
			},
		});
	});

	it("star adds STARRED label to threads", async () => {
		const { driver, users } = await setupDriver();
		users.threads.modify = vi.fn().mockResolvedValue({});

		await driver.star(["thread-1", "thread-2"]);

		expect(users.threads.modify).toHaveBeenCalledTimes(2);
		expect(users.threads.modify).toHaveBeenCalledWith({
			userId: "me",
			id: "thread-1",
			requestBody: { addLabelIds: ["STARRED"] },
		});
	});

	it("unstar removes STARRED label from threads", async () => {
		const { driver, users } = await setupDriver();
		users.threads.modify = vi.fn().mockResolvedValue({});

		await driver.unstar(["thread-1"]);

		expect(users.threads.modify).toHaveBeenCalledWith({
			userId: "me",
			id: "thread-1",
			requestBody: { removeLabelIds: ["STARRED"] },
		});
	});

	it("archive removes INBOX label from threads", async () => {
		const { driver, users } = await setupDriver();
		users.threads.modify = vi.fn().mockResolvedValue({});

		await driver.archive(["thread-1"]);

		expect(users.threads.modify).toHaveBeenCalledWith({
			userId: "me",
			id: "thread-1",
			requestBody: { removeLabelIds: ["INBOX"] },
		});
	});

	it("moveToInbox adds INBOX label to threads", async () => {
		const { driver, users } = await setupDriver();
		users.threads.modify = vi.fn().mockResolvedValue({});

		await driver.moveToInbox(["thread-1"]);

		expect(users.threads.modify).toHaveBeenCalledWith({
			userId: "me",
			id: "thread-1",
			requestBody: { addLabelIds: ["INBOX"] },
		});
	});

	it("trash moves threads to trash", async () => {
		const { driver, users } = await setupDriver();
		users.threads.trash = vi.fn().mockResolvedValue({});

		await driver.trash(["thread-1", "thread-2"]);

		expect(users.threads.trash).toHaveBeenCalledTimes(2);
		expect(users.threads.trash).toHaveBeenCalledWith({ userId: "me", id: "thread-1" });
	});

	it("untrash restores threads from trash", async () => {
		const { driver, users } = await setupDriver();
		users.threads.untrash = vi.fn().mockResolvedValue({});

		await driver.untrash(["thread-1"]);

		expect(users.threads.untrash).toHaveBeenCalledWith({ userId: "me", id: "thread-1" });
	});

	it("permanentlyDelete deletes thread", async () => {
		const { driver, users } = await setupDriver();
		users.threads.delete = vi.fn().mockResolvedValue({});

		await driver.permanentlyDelete("thread-1");

		expect(users.threads.delete).toHaveBeenCalledWith({ userId: "me", id: "thread-1" });
	});

	it("getUserLabels returns all labels", async () => {
		const { driver, users } = await setupDriver();
		users.labels.list = vi.fn().mockResolvedValue({
			data: {
				labels: [
					{ id: "INBOX", name: "INBOX" },
					{ id: "custom", name: "Custom" },
				],
			},
		});

		const labels = await driver.getUserLabels();

		expect(labels).toHaveLength(2);
		expect(labels[0]?.name).toBe("INBOX");
	});

	it("createUserLabel creates a visible Gmail label with colors", async () => {
		const { driver, users } = await setupDriver();
		users.labels.create = vi.fn().mockResolvedValue({
			data: {
				id: "label-1",
				name: "to respond",
			},
		});

		const label = await driver.createUserLabel({
			backgroundColor: "#f2b2a8",
			name: "to respond",
			textColor: "#8a1c0a",
		});

		expect(users.labels.create).toHaveBeenCalledWith({
			userId: "me",
			requestBody: {
				color: {
					backgroundColor: "#f2b2a8",
					textColor: "#8a1c0a",
				},
				labelListVisibility: "labelShow",
				messageListVisibility: "show",
				name: "to respond",
			},
		});
		expect(label.id).toBe("label-1");
	});

	it("setThreadLabels applies label updates to every thread", async () => {
		const { driver, users } = await setupDriver();
		users.threads.modify = vi.fn().mockResolvedValue({});

		await driver.setThreadLabels({
			addLabelIds: ["label-1"],
			removeLabelIds: ["label-2"],
			threadIds: ["thread-1", "thread-2"],
		});

		expect(users.threads.modify).toHaveBeenCalledTimes(2);
		expect(users.threads.modify).toHaveBeenCalledWith({
			userId: "me",
			id: "thread-1",
			requestBody: {
				addLabelIds: ["label-1"],
				removeLabelIds: ["label-2"],
			},
		});
	});

	it("setMessageLabels batches unique message label updates", async () => {
		const { driver, users } = await setupDriver();
		users.messages.batchModify = vi.fn().mockResolvedValue({});

		await driver.setMessageLabels({
			addLabelIds: ["label-1"],
			messageIds: ["msg-1", "msg-1", "msg-2"],
			removeLabelIds: ["label-2"],
		});

		expect(users.messages.batchModify).toHaveBeenCalledTimes(1);
		expect(users.messages.batchModify).toHaveBeenCalledWith({
			userId: "me",
			requestBody: {
				ids: ["msg-1", "msg-2"],
				addLabelIds: ["label-1"],
				removeLabelIds: ["label-2"],
			},
		});
	});

	it("getLabelCounts returns counts for main labels", async () => {
		const { driver, users } = await setupDriver();
		users.labels.get = vi.fn().mockImplementation(({ id }) => {
			const counts: Record<string, { name: string; threadsUnread: number; threadsTotal: number }> = {
				INBOX: { name: "INBOX", threadsUnread: 5, threadsTotal: 100 },
				SENT: { name: "SENT", threadsUnread: 0, threadsTotal: 50 },
				DRAFT: { name: "DRAFT", threadsUnread: 0, threadsTotal: 3 },
			};
			return Promise.resolve({ data: counts[id] || { name: id, threadsUnread: 0, threadsTotal: 0 } });
		});

		const counts = await driver.getLabelCounts();

		expect(counts).toContainEqual({ label: "inbox", count: 5 });
		expect(counts).toContainEqual({ label: "sent", count: 50 });
		expect(counts).toContainEqual({ label: "drafts", count: 3 });
	});

	it("getLabelCounts skips labels that fail", async () => {
		const { driver, users } = await setupDriver();
		users.labels.get = vi.fn().mockImplementation(({ id }) => {
			if (id === "SPAM") {
				return Promise.reject(new Error("No access"));
			}
			return Promise.resolve({ data: { name: id, threadsUnread: 1, threadsTotal: 1 } });
		});

		const counts = await driver.getLabelCounts();

		expect(counts.every((count) => count !== null)).toBe(true);
		expect(counts.find((count) => count?.label === "spam")).toBeUndefined();
	});

	it("getUserProfile returns profile data", async () => {
		const { driver, users } = await setupDriver();
		users.getProfile = vi.fn().mockResolvedValue({
			data: { emailAddress: "user@example.com", messagesTotal: 1000 },
		});

		const profile = await driver.getUserProfile();

		expect(profile.emailAddress).toBe("user@example.com");
	});

	it("getAttachment fetches attachment data", async () => {
		const { driver, users } = await setupDriver();
		users.messages.attachments.get = vi.fn().mockResolvedValue({
			data: { data: "base64data", size: 1024 },
		});

		const attachment = await driver.getAttachment("msg-1", "attachment-1");

		expect(users.messages.attachments.get).toHaveBeenCalledWith({
			userId: "me",
			messageId: "msg-1",
			id: "attachment-1",
		});
		expect(attachment.data).toBe("base64data");
	});

	it("getThread returns full thread with parsed messages", async () => {
		const { driver, users } = await setupDriver();
		users.threads.get = vi.fn().mockResolvedValue({
			data: {
				messages: [
					{
						id: "msg-1",
						threadId: "thread-1",
						labelIds: ["INBOX", "UNREAD"],
						snippet: "Test snippet",
						payload: {
							headers: [
								{ name: "Subject", value: "Test Subject" },
								{ name: "From", value: "sender@example.com" },
								{ name: "To", value: "recipient@example.com" },
								{ name: "Date", value: "2024-01-01" },
							],
							body: { data: "VGVzdCBib2R5" }, // "Test body" in base64
						},
					},
				],
			},
		});

		const thread = await driver.getThread("thread-1");

		expect(thread.messages).toHaveLength(1);
		expect(thread.messages[0]?.subject).toBe("Test Subject");
		expect(thread.hasUnread).toBe(true);
		expect(thread.totalReplies).toBe(1);
	});

	it("getThread handles all draft messages", async () => {
		const { driver, users } = await setupDriver();
		users.threads.get = vi.fn().mockResolvedValue({
			data: {
				messages: [
					{
						id: "msg-1",
						threadId: "thread-1",
						labelIds: ["DRAFT"],
						payload: { headers: [] },
					},
				],
			},
		});

		const thread = await driver.getThread("thread-1");

		expect(thread.latest).toBeUndefined();
		expect(thread.totalReplies).toBe(0);
	});

	it("getThread handles empty messages", async () => {
		const { driver, users } = await setupDriver();
		users.threads.get = vi.fn().mockResolvedValue({
			data: { messages: null },
		});

		const thread = await driver.getThread("thread-1");

		expect(thread.messages).toEqual([]);
		expect(thread.hasUnread).toBe(false);
	});

	it("parseMessage prefers HTML body over plain text", async () => {
		const { driver } = await setupDriver();

		const message = {
			id: "msg-1",
			payload: {
				headers: [{ name: "From", value: "Alice <alice@example.com>" }],
				parts: [
					{
						mimeType: "multipart/alternative",
						parts: [
							{ mimeType: "text/plain", body: { data: toBase64Url("Plain body") } },
							{ mimeType: "text/html", body: { data: toBase64Url("<p>HTML body</p>") } },
						],
					},
				],
			},
			labelIds: [],
		};

		const parsed = driver.parseMessage(message as unknown as gmail_v1.Schema$Message);

		expect(parsed.decodedBody).toBe("<p>HTML body</p>");
	});

	it("parseMessage handles multiple senders and attachments", async () => {
		const { driver } = await setupDriver();

		const message = {
			id: "msg-1",
			payload: {
				headers: [
					{ name: "From", value: "Alice <alice@example.com>, Bob <bob@example.com>" },
					{ name: "To", value: "Charlie <charlie@example.com>, Dana <dana@example.com>" },
				],
				parts: [
					{
						filename: "inline.png",
						mimeType: "image/png",
						body: { attachmentId: "inline-1", size: 123 },
						headers: [{ name: "Content-Disposition", value: "inline" }],
					},
					{
						filename: "file.pdf",
						mimeType: "application/pdf",
						body: { attachmentId: "file-1", size: 456 },
					},
				],
			},
			labelIds: [],
		};

		const parsed = driver.parseMessage(message as unknown as gmail_v1.Schema$Message);

		expect(parsed.sender.email).toBe("alice@example.com");
		expect(parsed.to).toHaveLength(2);
		expect(parsed.attachments).toHaveLength(1);
		expect(parsed.attachments?.[0]?.filename).toBe("file.pdf");
	});
});
