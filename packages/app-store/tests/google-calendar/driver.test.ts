import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.GOOGLE_CLIENT_ID = "test-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

const authInstances: Array<{ credentials: Record<string, unknown> }> = [];
const fetchMock = vi.fn();
const refreshAccessTokenMock = vi.fn();

vi.mock("google-auth-library", () => ({
	OAuth2Client: class {
		credentials: Record<string, unknown> = {};

		constructor() {
			authInstances.push(this);
		}

		setCredentials = vi.fn((credentials: Record<string, unknown>) => {
			this.credentials = credentials;
		});

		refreshAccessToken = vi.fn(async () => refreshAccessTokenMock(this.credentials));
	},
}));

vi.mock("../../src/google-calendar/config.ts", () => ({
	googleCalendarConfig: {
		clientId: "client-id",
		clientSecret: "client-secret",
		redirectUri: "https://example.com/callback",
	},
}));

const loadDriver = async () => {
	const module = await import("../../src/google-calendar/driver");
	return module.GoogleCalendarDriver;
};

describe("GoogleCalendarDriver", () => {
	beforeEach(() => {
		authInstances.length = 0;
		vi.clearAllMocks();
		refreshAccessTokenMock.mockReset();
		fetchMock.mockReset();
		vi.stubGlobal("fetch", fetchMock);

		fetchMock.mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({
				kind: "calendar#calendarList",
				items: [],
			}),
		});

		refreshAccessTokenMock.mockImplementation(async (credentials: Record<string, unknown>) => {
			if (!credentials.refresh_token) {
				throw new Error("missing refresh token");
			}

			return {
				credentials: {
					access_token: "refreshed-access-token",
					expiry_date: 1_700_000_000_000,
				},
			};
		});
	});

	it("marks revoked tokens with the google_calendar provider", async () => {
		refreshAccessTokenMock.mockRejectedValueOnce(
			Object.assign(new Error("invalid_grant"), {
				code: "invalid_grant",
			})
		);

		const GoogleCalendarDriver = await loadDriver();
		const driver = new GoogleCalendarDriver({
			accessToken: "stale-access-token",
			refreshToken: "refresh-token",
			email: "calendar@example.com",
		});

		await expect(driver.refreshAccessToken()).rejects.toMatchObject({
			name: "OAuthTokenRevokedError",
			provider: "google_calendar",
		});
	});

	it("preserves the refresh token across repeated refreshes", async () => {
		const GoogleCalendarDriver = await loadDriver();
		const driver = new GoogleCalendarDriver({
			accessToken: "",
			refreshToken: "refresh-token",
			email: "calendar@example.com",
		});

		await expect(driver.listCalendars()).resolves.toEqual({
			kind: "calendar#calendarList",
			items: [],
		});

		authInstances[0]!.credentials.access_token = undefined;

		await expect(driver.listCalendars()).resolves.toEqual({
			kind: "calendar#calendarList",
			items: [],
		});
	});
});
