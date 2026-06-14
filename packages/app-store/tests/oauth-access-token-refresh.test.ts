import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OAuthProvider } from "@starter/db";

const gmailRefreshAccessToken = vi.fn();
const googleCalendarRefreshAccessToken = vi.fn();

vi.mock("../src/gmail/driver.ts", () => ({
	createGmailDriver: () => ({
		refreshAccessToken: gmailRefreshAccessToken,
	}),
}));

vi.mock("../src/google-calendar/driver.ts", () => ({
	createGoogleCalendarDriver: () => ({
		refreshAccessToken: googleCalendarRefreshAccessToken,
	}),
}));

import {
	oauthProvidersWithAccessTokenRefresh,
	refreshOAuthProviderAccessToken,
} from "../src/oauth-access-token-refresh.ts";

describe("oauth-access-token-refresh", () => {
	beforeEach(() => {
		gmailRefreshAccessToken.mockReset();
		googleCalendarRefreshAccessToken.mockReset();
	});

	it("lists providers that implement token refresh", () => {
		expect(oauthProvidersWithAccessTokenRefresh).toContain("gmail");
		expect(oauthProvidersWithAccessTokenRefresh).toContain("google_calendar");
	});

	it("throws when no refresher is registered for the provider", async () => {
		await expect(
			refreshOAuthProviderAccessToken({
				provider: "phantom-provider" as OAuthProvider,
				accessToken: "a",
				refreshToken: "r",
				email: "e@example.com",
			})
		).rejects.toThrow(/No OAuth access token refresher registered/);
	});

	it("refreshes Gmail access tokens with the provider driver", async () => {
		const result = {
			accessToken: "gmail-next",
			expiresAt: new Date("2026-01-01T00:00:00.000Z"),
		};
		gmailRefreshAccessToken.mockResolvedValue(result);

		await expect(
			refreshOAuthProviderAccessToken({
				provider: "gmail",
				accessToken: "gmail-current",
				refreshToken: "gmail-refresh",
				email: "gmail@example.com",
			})
		).resolves.toEqual(result);

		expect(gmailRefreshAccessToken).toHaveBeenCalledTimes(1);
		expect(googleCalendarRefreshAccessToken).not.toHaveBeenCalled();
	});

	it("refreshes Google Calendar access tokens with the provider driver", async () => {
		const result = {
			accessToken: "calendar-next",
			expiresAt: new Date("2026-02-02T00:00:00.000Z"),
		};
		googleCalendarRefreshAccessToken.mockResolvedValue(result);

		await expect(
			refreshOAuthProviderAccessToken({
				provider: "google_calendar",
				accessToken: "calendar-current",
				refreshToken: "calendar-refresh",
				email: "calendar@example.com",
			})
		).resolves.toEqual(result);

		expect(googleCalendarRefreshAccessToken).toHaveBeenCalledTimes(1);
		expect(gmailRefreshAccessToken).not.toHaveBeenCalled();
	});
});
