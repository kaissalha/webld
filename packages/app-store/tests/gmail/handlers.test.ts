import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.GOOGLE_CLIENT_ID = "test-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockUpdateWhere = vi.fn();

vi.mock("@webld/db", () => {
	return {
		db: {
			select: mockSelect,
			insert: mockInsert,
			update: mockUpdate,
		},
		oauthConnections: {
			externalId: "external_id",
			provider: "provider",
			organizationId: "organization_id",
			id: "id",
		},
	};
});

const oauth2ClientMock = {
	generateAuthUrl: vi.fn(),
	getToken: vi.fn(),
	setCredentials: vi.fn(),
};

vi.mock("google-auth-library", () => {
	return {
		OAuth2Client: class {
			generateAuthUrl = oauth2ClientMock.generateAuthUrl;
			getToken = oauth2ClientMock.getToken;
			setCredentials = oauth2ClientMock.setCredentials;
		},
	};
});

const betterFetchMock = vi.fn();

vi.mock("@better-fetch/fetch", () => {
	return {
		betterFetch: betterFetchMock,
	};
});

const loadHandlers = async () => {
	return await import("../../src/gmail/handlers");
};

const setupDbMocks = () => {
	const selectChain = { from: mockFrom };
	const fromChain = { where: mockWhere };
	const whereChain = { limit: mockLimit };
	const insertChain = { values: mockValues };
	const valuesChain = { returning: mockReturning };
	const updateChain = { set: mockSet };
	const setChain = { where: mockUpdateWhere };

	mockSelect.mockReturnValue(selectChain);
	mockFrom.mockReturnValue(fromChain);
	mockWhere.mockReturnValue(whereChain);
	mockLimit.mockResolvedValue([]);
	mockInsert.mockReturnValue(insertChain);
	mockValues.mockReturnValue(valuesChain);
	mockReturning.mockResolvedValue([{ id: "connection-1" }]);
	mockUpdate.mockReturnValue(updateChain);
	mockSet.mockReturnValue(setChain);
	mockUpdateWhere.mockResolvedValue(undefined);
};

describe("gmail handlers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDbMocks();
	});

	describe("createGmailAuthUrl", () => {
		it("creates Gmail auth URL", async () => {
			oauth2ClientMock.generateAuthUrl.mockReturnValue("https://auth.example.com");
			const { createGmailAuthUrl } = await loadHandlers();
			const url = createGmailAuthUrl({ userId: "user-1", organizationId: "org-1" });

			expect(url).toBe("https://auth.example.com");
			expect(oauth2ClientMock.generateAuthUrl).toHaveBeenCalledWith({
				access_type: "offline",
				scope: expect.arrayContaining([
					"https://mail.google.com/",
					"https://www.googleapis.com/auth/gmail.readonly",
					"https://www.googleapis.com/auth/gmail.send",
					"https://www.googleapis.com/auth/gmail.modify",
					"https://www.googleapis.com/auth/userinfo.email",
					"https://www.googleapis.com/auth/userinfo.profile",
				]),
				prompt: "consent",
				state: expect.any(String),
			});
		});

		it("encodes user and organization IDs in state", async () => {
			oauth2ClientMock.generateAuthUrl.mockReturnValue("https://auth.example.com");
			const { createGmailAuthUrl } = await loadHandlers();
			createGmailAuthUrl({ userId: "user-123", organizationId: "org-456" });

			const call = oauth2ClientMock.generateAuthUrl.mock.calls[0]?.[0];
			const decodedState = JSON.parse(Buffer.from(call?.state ?? "", "base64url").toString()) as {
				userId: string;
				organizationId: string;
			};

			expect(decodedState.userId).toBe("user-123");
			expect(decodedState.organizationId).toBe("org-456");
		});
	});

	describe("handleGmailCallback", () => {
		it("returns oauth_denied when error is present", async () => {
			const { handleGmailCallback } = await loadHandlers();
			const result = await handleGmailCallback({ code: "code", state: "state", error: "access_denied" });

			expect(result).toEqual({ success: false, error: "oauth_denied" });
		});

		it("returns missing params for missing code", async () => {
			const { handleGmailCallback } = await loadHandlers();
			const result = await handleGmailCallback({ code: null, state: "state", error: null });

			expect(result).toEqual({ success: false, error: "missing_params" });
		});

		it("returns missing params for missing state", async () => {
			const { handleGmailCallback } = await loadHandlers();
			const result = await handleGmailCallback({ code: "code", state: null, error: null });

			expect(result).toEqual({ success: false, error: "missing_params" });
		});

		it("returns invalid state for malformed payload", async () => {
			const { handleGmailCallback } = await loadHandlers();
			const result = await handleGmailCallback({ code: "code", state: "not-base64", error: null });

			expect(result).toEqual({ success: false, error: "invalid_state" });
		});

		it("returns invalid state for invalid JSON in state", async () => {
			const { handleGmailCallback } = await loadHandlers();
			const invalidState = Buffer.from("not valid json").toString("base64url");
			const result = await handleGmailCallback({ code: "code", state: invalidState, error: null });

			expect(result).toEqual({ success: false, error: "invalid_state" });
		});

		it("returns token_exchange_failed when getToken throws", async () => {
			oauth2ClientMock.getToken.mockRejectedValue(new Error("Token exchange error"));

			const state = Buffer.from(JSON.stringify({ userId: "user-1", organizationId: "org-1" })).toString(
				"base64url"
			);
			const { handleGmailCallback } = await loadHandlers();
			const result = await handleGmailCallback({ code: "code", state, error: null });

			expect(result).toEqual({ success: false, error: "token_exchange_failed" });
		});

		it("returns missing_tokens when access_token is missing", async () => {
			oauth2ClientMock.getToken.mockResolvedValue({ tokens: { refresh_token: "refresh" } });

			const state = Buffer.from(JSON.stringify({ userId: "user-1", organizationId: "org-1" })).toString(
				"base64url"
			);
			const { handleGmailCallback } = await loadHandlers();
			const result = await handleGmailCallback({ code: "code", state, error: null });

			expect(result).toEqual({ success: false, error: "missing_tokens" });
		});

		it("returns missing_tokens when refresh_token is missing", async () => {
			oauth2ClientMock.getToken.mockResolvedValue({ tokens: { access_token: "access" } });

			const state = Buffer.from(JSON.stringify({ userId: "user-1", organizationId: "org-1" })).toString(
				"base64url"
			);
			const { handleGmailCallback } = await loadHandlers();
			const result = await handleGmailCallback({ code: "code", state, error: null });

			expect(result).toEqual({ success: false, error: "missing_tokens" });
		});

		it("returns user_info_failed when betterFetch returns error", async () => {
			oauth2ClientMock.getToken.mockResolvedValue({
				tokens: { access_token: "access", refresh_token: "refresh" },
			});
			betterFetchMock.mockResolvedValue({ data: null, error: { message: "Fetch failed" } });

			const state = Buffer.from(JSON.stringify({ userId: "user-1", organizationId: "org-1" })).toString(
				"base64url"
			);
			const { handleGmailCallback } = await loadHandlers();
			const result = await handleGmailCallback({ code: "code", state, error: null });

			expect(result).toEqual({ success: false, error: "user_info_failed" });
		});

		it("returns user_info_failed when betterFetch returns no data", async () => {
			oauth2ClientMock.getToken.mockResolvedValue({
				tokens: { access_token: "access", refresh_token: "refresh" },
			});
			betterFetchMock.mockResolvedValue({ data: null, error: null });

			const state = Buffer.from(JSON.stringify({ userId: "user-1", organizationId: "org-1" })).toString(
				"base64url"
			);
			const { handleGmailCallback } = await loadHandlers();
			const result = await handleGmailCallback({ code: "code", state, error: null });

			expect(result).toEqual({ success: false, error: "user_info_failed" });
		});

		it("creates new connection on success", async () => {
			oauth2ClientMock.getToken.mockResolvedValue({
				tokens: { access_token: "access", refresh_token: "refresh", expiry_date: Date.now() + 3600000 },
			});
			betterFetchMock.mockResolvedValue({
				data: { email: "user@example.com", id: "external-id", name: "User", picture: "https://photo.url" },
				error: null,
			});

			const state = Buffer.from(JSON.stringify({ userId: "user-1", organizationId: "org-1" })).toString(
				"base64url"
			);
			const { handleGmailCallback } = await loadHandlers();
			const result = await handleGmailCallback({ code: "code", state, error: null });

			expect(result).toEqual({ success: true, connectionId: "connection-1" });
			expect(mockInsert).toHaveBeenCalled();
		});

		it("updates existing connection when found", async () => {
			oauth2ClientMock.getToken.mockResolvedValue({
				tokens: { access_token: "new-access", refresh_token: "new-refresh" },
			});
			betterFetchMock.mockResolvedValue({
				data: { email: "user@example.com", id: "external-id", name: "User" },
				error: null,
			});
			mockLimit.mockResolvedValue([{ id: "existing-connection-id" }]);

			const state = Buffer.from(JSON.stringify({ userId: "user-1", organizationId: "org-1" })).toString(
				"base64url"
			);
			const { handleGmailCallback } = await loadHandlers();
			const result = await handleGmailCallback({ code: "code", state, error: null });

			expect(result).toEqual({ success: true, connectionId: "existing-connection-id" });
			expect(mockUpdate).toHaveBeenCalled();
			expect(mockInsert).not.toHaveBeenCalled();
		});

		it("sets credentials on oauth2Client before fetching user info", async () => {
			oauth2ClientMock.getToken.mockResolvedValue({
				tokens: { access_token: "access-token", refresh_token: "refresh" },
			});
			betterFetchMock.mockResolvedValue({
				data: { email: "user@example.com", id: "external-id", name: "User" },
				error: null,
			});

			const state = Buffer.from(JSON.stringify({ userId: "user-1", organizationId: "org-1" })).toString(
				"base64url"
			);
			const { handleGmailCallback } = await loadHandlers();
			await handleGmailCallback({ code: "code", state, error: null });

			expect(oauth2ClientMock.setCredentials).toHaveBeenCalledWith(
				expect.objectContaining({ access_token: "access-token" })
			);
		});

		it("uses default expiry when not provided", async () => {
			oauth2ClientMock.getToken.mockResolvedValue({
				tokens: { access_token: "access", refresh_token: "refresh" }, // no expiry_date
			});
			betterFetchMock.mockResolvedValue({
				data: { email: "user@example.com", id: "external-id", name: "User" },
				error: null,
			});

			const state = Buffer.from(JSON.stringify({ userId: "user-1", organizationId: "org-1" })).toString(
				"base64url"
			);
			const { handleGmailCallback } = await loadHandlers();
			const result = await handleGmailCallback({ code: "code", state, error: null });

			expect(result.success).toBe(true);
		});
	});
});
