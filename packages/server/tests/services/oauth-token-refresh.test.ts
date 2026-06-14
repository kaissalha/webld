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
	oauthConnections: {},
}));

const { refreshOAuthProviderAccessToken, isOAuthTokenRevokedError } = vi.hoisted(() => ({
	refreshOAuthProviderAccessToken: vi.fn(),
	isOAuthTokenRevokedError: vi.fn(() => false),
}));

vi.mock("@webld/app-store", () => ({
	refreshOAuthProviderAccessToken,
	isOAuthTokenRevokedError,
	oauthProvidersWithAccessTokenRefresh: ["gmail"],
}));

import { refreshStoredOAuthAccessToken, runOAuthTokenRefreshJob } from "../../src/services/oauth-token-refresh";

const baseConnection = {
	id: "conn-1",
	organizationId: "org-1",
	accessToken: "old",
	refreshToken: "refresh",
	email: "user@example.com",
	expiresAt: new Date(0).toISOString(),
	status: "connected",
	provider: "gmail",
} as unknown as OAuthConnection;

describe("oauth-token-refresh service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelect.mockReturnValue({ from: mockFrom });
		mockFrom.mockReturnValue({ where: mockWhere });
		mockWhere.mockReturnValue({ limit: mockLimit });
		mockUpdate.mockReturnValue({ set: mockSet });
		mockSet.mockReturnValue({ where: mockUpdateWhere });
		mockUpdateWhere.mockResolvedValue(undefined);
	});

	it("refreshStoredOAuthAccessToken updates tokens", async () => {
		refreshOAuthProviderAccessToken.mockResolvedValue({
			accessToken: "new-access",
			expiresAt: new Date(Date.now() + 3600_000),
		});

		const token = await refreshStoredOAuthAccessToken(baseConnection);

		expect(token).toBe("new-access");
		expect(refreshOAuthProviderAccessToken).toHaveBeenCalledWith({
			provider: "gmail",
			accessToken: "old",
			refreshToken: "refresh",
			email: "user@example.com",
		});
		expect(mockUpdate).toHaveBeenCalled();
	});

	it("runOAuthTokenRefreshJob processes selected connections", async () => {
		mockLimit.mockResolvedValue([baseConnection]);
		refreshOAuthProviderAccessToken.mockResolvedValue({
			accessToken: "new-access",
			expiresAt: new Date(Date.now() + 3600_000),
		});

		const result = await runOAuthTokenRefreshJob({ limit: 10 });

		expect(result.examined).toBe(1);
		expect(result.refreshed).toBe(1);
		expect(result.failed).toBe(0);
	});

	it("runOAuthTokenRefreshJob counts failures", async () => {
		mockLimit.mockResolvedValue([baseConnection]);
		refreshOAuthProviderAccessToken.mockRejectedValue(new Error("network"));

		const result = await runOAuthTokenRefreshJob({ limit: 10 });

		expect(result.refreshed).toBe(0);
		expect(result.failed).toBe(1);
	});

	it("does not expire the connection on transient refresh failures", async () => {
		refreshOAuthProviderAccessToken.mockRejectedValue(new Error("network"));
		isOAuthTokenRevokedError.mockReturnValue(false);

		await expect(refreshStoredOAuthAccessToken(baseConnection)).rejects.toThrow(
			"Failed to refresh OAuth access token. Please reconnect your account."
		);

		expect(mockSet).not.toHaveBeenCalledWith({ status: "expired" });
	});

	it("expires the connection when the provider token is revoked", async () => {
		const revokedError = new Error("revoked");
		refreshOAuthProviderAccessToken.mockRejectedValue(revokedError);
		isOAuthTokenRevokedError.mockReturnValue(true);

		await expect(refreshStoredOAuthAccessToken(baseConnection)).rejects.toBe(revokedError);

		expect(mockSet).toHaveBeenCalledWith({ status: "expired" });
	});
});
