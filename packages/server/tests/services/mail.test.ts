import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OAuthConnection } from "@webld/db";

const { mockSelect, mockFrom, mockWhere, mockLimit, mockUpdate, mockSet, mockUpdateWhere } = vi.hoisted(() => ({
	mockSelect: vi.fn(),
	mockFrom: vi.fn(),
	mockWhere: vi.fn(),
	mockLimit: vi.fn(),
	mockUpdate: vi.fn(),
	mockSet: vi.fn(),
	mockUpdateWhere: vi.fn(),
}));

vi.mock("@webld/db", () => ({
	db: {
		select: mockSelect,
		update: mockUpdate,
	},
	oauthConnections: {
		id: "id",
		organizationId: "organization_id",
		provider: "provider",
		status: "status",
		userId: "user_id",
	},
}));

const { driverInstance, createGmailDriver, isOAuthTokenRevokedError, refreshOAuthProviderAccessToken } = vi.hoisted(
	() => {
		const instance = {
			refreshAccessToken: vi.fn(),
			listThreads: vi.fn(),
			getThreadPreview: vi.fn(),
			getUserLabels: vi.fn(),
			sendEmail: vi.fn(),
		};
		return {
			driverInstance: instance,
			createGmailDriver: vi.fn(() => instance),
			isOAuthTokenRevokedError: vi.fn(),
			refreshOAuthProviderAccessToken: vi.fn(),
		};
	}
);

const {
	applyMailClassificationLabels,
	getMailClassificationLabel,
	scheduleMailClassificationLabelWrite,
	serializeMailLabel,
} = vi.hoisted(() => ({
	applyMailClassificationLabels: vi.fn(async ({ threads }) => threads),
	getMailClassificationLabel: vi.fn(({ labelIds, labels }: { labelIds: string[]; labels: Array<{ id: string }> }) => {
		const labelIdSet = new Set(labelIds);

		return labels.find((label) => labelIdSet.has(label.id)) ?? null;
	}),
	serializeMailLabel: vi.fn((label) =>
		label?.id && label?.name
			? {
					backgroundColor: label.color?.backgroundColor ?? null,
					id: label.id,
					name: label.name,
					textColor: label.color?.textColor ?? null,
				}
			: null
	),
	scheduleMailClassificationLabelWrite: vi.fn(),
}));
const { generateText } = vi.hoisted(() => ({
	generateText: vi.fn(),
}));

vi.mock("@webld/app-store", () => ({
	createGmailDriver,
	getMailClassificationLabelName: (value: string | null | undefined) => {
		if (!value) {
			return null;
		}

		const labels = new Set(["to respond", "meeting update", "fyi", "notification", "marketing"]);
		const normalizedValue = value.trim().toLowerCase();

		return labels.has(normalizedValue) ? normalizedValue : null;
	},
	isOAuthTokenRevokedError,
	MAIL_CLASSIFICATION_LABELS: ["to respond", "meeting update", "fyi", "notification", "marketing"],
	MAIL_CLASSIFICATION_LABEL_DEFINITIONS: {
		"to respond": { backgroundColor: "#f2b2a8", description: "Needs reply.", textColor: "#8a1c0a" },
		"meeting update": { backgroundColor: "#c9daf8", description: "Meeting logistics.", textColor: "#0d3472" },
		fyi: { backgroundColor: "#e4d7f5", description: "Informational.", textColor: "#3d188e" },
		notification: { backgroundColor: "#b3efd3", description: "Automated update.", textColor: "#0b4f30" },
		marketing: { backgroundColor: "#fef1d1", description: "Promotional.", textColor: "#684e07" },
	},
	refreshOAuthProviderAccessToken,
	oauthProvidersWithAccessTokenRefresh: ["gmail"],
}));

vi.mock("../../src/services/mail-classification", () => ({
	applyMailClassificationLabels,
	getMailClassificationLabel,
	scheduleMailClassificationLabelWrite,
	serializeMailLabel,
}));
vi.mock("ai", () => ({
	Output: {
		object: vi.fn(({ schema }: { schema: unknown }) => ({ schema })),
	},
	generateText,
}));
vi.mock("@webld/ai/models", () => ({
	models: {
		fast: {
			model: "fast-model",
		},
	},
}));

import {
	createDriverFromConnection,
	getMailConnection,
	type MailThreadListStreamChunk,
	listMailConnections,
	listMailThreads,
	rewriteMailSearchQuery,
	sendMail,
} from "../../src/services/mail";

const setupDbMocks = (rows: unknown[]) => {
	mockSelect.mockReturnValue({ from: mockFrom });
	mockFrom.mockReturnValue({ where: mockWhere });
	mockWhere.mockReturnValue({ limit: mockLimit });
	mockLimit.mockResolvedValue(rows);
	mockUpdate.mockReturnValue({ set: mockSet });
	mockSet.mockReturnValue({ where: mockUpdateWhere });
	mockUpdateWhere.mockResolvedValue(undefined);
};

const collectMailThreadListStream = async (stream: AsyncGenerator<MailThreadListStreamChunk>) => {
	const chunks: MailThreadListStreamChunk[] = [];

	for await (const chunk of stream) {
		chunks.push(chunk);
	}

	return chunks;
};

describe("mail service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		driverInstance.getUserLabels.mockResolvedValue([]);
	});

	it("returns connection by id", async () => {
		setupDbMocks([{ id: "conn-1", organizationId: "org-1" }]);

		const connection = await getMailConnection({ organizationId: "org-1", connectionId: "conn-1" });

		expect(connection?.id).toBe("conn-1");
	});

	it("lists connections", async () => {
		setupDbMocks([]);
		mockWhere.mockResolvedValue([{ id: "conn-1" }]);

		const connections = await listMailConnections({ organizationId: "org-1" });

		expect(connections).toHaveLength(1);
	});

	it("rewrites natural mail searches into Gmail queries", async () => {
		generateText.mockResolvedValue({
			output: {
				query: "is:unread",
			},
		});

		const result = await rewriteMailSearchQuery({ localDate: "2026-04-23", search: "unread" });

		expect(result).toEqual({ query: "is:unread" });
		expect(generateText).toHaveBeenCalledWith(
			expect.objectContaining({
				model: "fast-model",
				prompt: expect.stringContaining("Current local date: 2026-04-23"),
				temperature: 0,
			})
		);
	});

	it("falls back to the raw search when query rewriting fails", async () => {
		generateText.mockRejectedValue(new Error("gateway failed"));

		const result = await rewriteMailSearchQuery({
			localDate: "2026-04-23",
			search: "emails from jane last week",
		});

		expect(result).toEqual({ query: "emails from jane last week" });
	});

	it("refreshes token when expired", async () => {
		setupDbMocks([{ id: "conn-1", expiresAt: new Date(0).toISOString() }]);
		refreshOAuthProviderAccessToken.mockResolvedValue({
			accessToken: "new-access",
			expiresAt: new Date(Date.now() + 1000),
		});

		const driver = await createDriverFromConnection({
			id: "conn-1",
			organizationId: "org-1",
			provider: "gmail",
			accessToken: "old",
			refreshToken: "refresh",
			email: "user@example.com",
			expiresAt: new Date(0).toISOString(),
		} as unknown as OAuthConnection);

		expect(driver).toBe(driverInstance);
		expect(refreshOAuthProviderAccessToken).toHaveBeenCalledWith({
			provider: "gmail",
			accessToken: "old",
			refreshToken: "refresh",
			email: "user@example.com",
		});
	});

	it("returns threads with connection info", async () => {
		setupDbMocks([{ id: "conn-1", organizationId: "org-1", email: "user@example.com" }]);
		driverInstance.listThreads.mockResolvedValue({ threads: [], nextPageToken: null });

		const [result] = await collectMailThreadListStream(
			listMailThreads({ organizationId: "org-1", connectionId: "conn-1" })
		);

		expect(result).toEqual({
			page: {
				connectionEmail: "user@example.com",
				connectionId: "conn-1",
				nextPageToken: null,
				threads: [],
			},
			type: "threads",
		});
		expect(applyMailClassificationLabels).not.toHaveBeenCalled();
	});

	it("returns paginated thread loads without classifying during reads", async () => {
		setupDbMocks([{ id: "conn-1", organizationId: "org-1", email: "user@example.com" }]);
		driverInstance.listThreads.mockResolvedValue({ threads: [], nextPageToken: "next-page" });

		const [result] = await collectMailThreadListStream(
			listMailThreads({
				organizationId: "org-1",
				connectionId: "conn-1",
				pageToken: "page-2",
			})
		);

		expect(result).toMatchObject({
			page: {
				nextPageToken: "next-page",
			},
			type: "threads",
		});
		expect(driverInstance.listThreads).toHaveBeenCalledWith({
			folder: "inbox",
			maxResults: undefined,
			pageToken: "page-2",
			query: undefined,
		});
		expect(applyMailClassificationLabels).not.toHaveBeenCalled();
	});

	it("streams existing classification labels with the initial thread page", async () => {
		setupDbMocks([{ id: "conn-1", organizationId: "org-1", email: "user@example.com" }]);
		driverInstance.getUserLabels.mockResolvedValue([
			{
				color: {
					backgroundColor: "#f2b2a8",
					textColor: "#8a1c0a",
				},
				id: "label-to-respond",
				name: "to respond",
			},
		]);
		driverInstance.listThreads.mockResolvedValue({
			nextPageToken: null,
			threads: [
				{
					id: "thread-1",
					isStarred: false,
					isUnread: true,
					labelIds: ["label-to-respond"],
					messageIds: ["message-1"],
					receivedOn: "2026-04-22T12:00:00.000Z",
					sender: {
						email: "assistant@example.com",
					},
					snippet: "Need your reply",
					subject: "Follow-up",
				},
			],
		});

		const chunks = await collectMailThreadListStream(
			listMailThreads({
				classifyUnlabeled: true,
				connectionId: "conn-1",
				organizationId: "org-1",
			})
		);

		expect(chunks).toEqual([
			{
				page: {
					connectionEmail: "user@example.com",
					connectionId: "conn-1",
					nextPageToken: null,
					threads: [
						{
							classificationLabel: {
								backgroundColor: "#f2b2a8",
								id: "label-to-respond",
								name: "to respond",
								textColor: "#8a1c0a",
							},
							id: "thread-1",
							isStarred: false,
							isUnread: true,
							labelIds: ["label-to-respond"],
							receivedOn: "2026-04-22T12:00:00.000Z",
							sender: {
								email: "assistant@example.com",
							},
							snippet: "Need your reply",
							subject: "Follow-up",
						},
					],
				},
				type: "threads",
			},
		]);
		expect(applyMailClassificationLabels).not.toHaveBeenCalled();
	});

	it("streams classification patches before scheduling Gmail label writes", async () => {
		setupDbMocks([{ id: "conn-1", organizationId: "org-1", email: "user@example.com" }]);
		const thread = {
			classificationLabel: null,
			id: "thread-1",
			isStarred: false,
			isUnread: true,
			labelIds: [],
			messageIds: ["message-1"],
			receivedOn: "2026-04-22T12:00:00.000Z",
			sender: {
				email: "assistant@example.com",
			},
			snippet: "Need your reply",
			subject: "Follow-up",
		};
		const classificationLabel = {
			backgroundColor: "#f2b2a8",
			id: "to respond",
			name: "to respond",
			textColor: "#8a1c0a",
		};

		driverInstance.listThreads.mockResolvedValue({ threads: [thread], nextPageToken: null });
		applyMailClassificationLabels.mockResolvedValueOnce([
			{
				...thread,
				classificationLabel,
				labelIds: ["to respond"],
			},
		]);

		const chunks = await collectMailThreadListStream(
			listMailThreads({
				classifyUnlabeled: true,
				connectionId: "conn-1",
				organizationId: "org-1",
			})
		);

		expect(chunks).toEqual([
			{
				page: {
					connectionEmail: "user@example.com",
					connectionId: "conn-1",
					nextPageToken: null,
					threads: [
						{
							classificationLabel: null,
							id: "thread-1",
							isStarred: false,
							isUnread: true,
							labelIds: [],
							receivedOn: "2026-04-22T12:00:00.000Z",
							sender: {
								email: "assistant@example.com",
							},
							snippet: "Need your reply",
							subject: "Follow-up",
						},
					],
				},
				type: "threads",
			},
			{
				classifications: [
					{
						classificationLabel,
						labelIds: ["to respond"],
						threadId: "thread-1",
					},
				],
				type: "classifications",
			},
		]);
		expect(applyMailClassificationLabels).toHaveBeenCalledWith({
			applyNativeLabels: false,
			connectionEmail: "user@example.com",
			driver: driverInstance,
			folder: "inbox",
			threads: [thread],
		});
		expect(scheduleMailClassificationLabelWrite).toHaveBeenCalledWith({
			driver: driverInstance,
			nextClassifications: new Map([["thread-1", "to respond"]]),
			threads: [thread],
		});
	});

	it("converts plain text bodies to html before sending", async () => {
		setupDbMocks([{ id: "conn-1", organizationId: "org-1", email: "user@example.com" }]);
		driverInstance.sendEmail.mockResolvedValue({ id: "sent" });

		await sendMail({
			organizationId: "org-1",
			connectionId: "conn-1",
			to: [{ email: "lead@example.com" }],
			subject: "Follow-up",
			body: "Hi <team>,\nThanks for coming in.",
		});

		expect(driverInstance.sendEmail).toHaveBeenCalledWith({
			to: [{ email: "lead@example.com" }],
			subject: "Follow-up",
			html: '<div dir="auto">Hi &lt;team&gt;,<br />Thanks for coming in.</div>',
		});
	});
});
