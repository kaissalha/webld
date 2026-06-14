import type { OAuthProvider } from "@webld/db";

export type OAuthAccessTokenRefreshInput = {
	accessToken: string;
	refreshToken: string;
	email: string;
};

export type OAuthAccessTokenRefreshResult = {
	accessToken: string;
	expiresAt: Date;
};

type OAuthAccessTokenRefresher = (connection: OAuthAccessTokenRefreshInput) => Promise<OAuthAccessTokenRefreshResult>;

/**
 * Register a refresher here when you add a provider to `oauth_provider` and implement token refresh.
 */
const oauthAccessTokenRefreshers = {
	gmail: async (connection) => {
		const { createGmailDriver } = await import("./gmail/driver.ts");
		const driver = createGmailDriver(connection);
		return driver.refreshAccessToken();
	},
	google_calendar: async (connection) => {
		const { createGoogleCalendarDriver } = await import("./google-calendar/driver.ts");
		const driver = createGoogleCalendarDriver(connection);
		return driver.refreshAccessToken();
	},
} satisfies Partial<Record<OAuthProvider, OAuthAccessTokenRefresher>>;

const providersWithRefresh = Object.keys(oauthAccessTokenRefreshers) as OAuthProvider[];

export const oauthProvidersWithAccessTokenRefresh: readonly OAuthProvider[] = Object.freeze(
	providersWithRefresh.slice()
);

export const refreshOAuthProviderAccessToken = async ({
	provider,
	accessToken,
	refreshToken,
	email,
}: OAuthAccessTokenRefreshInput & { provider: OAuthProvider }) => {
	const refresher = oauthAccessTokenRefreshers[provider];
	if (!refresher) {
		throw new Error(`No OAuth access token refresher registered for provider: ${provider}`);
	}

	return refresher({ accessToken, refreshToken, email });
};
