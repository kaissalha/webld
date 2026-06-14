export type OAuthAppConfig<TScopes extends readonly string[] = readonly string[]> = {
	/** Display name */
	name: string;
	/** App description */
	description: string;
	/** Logo URL or path */
	logo: string;
	/** OAuth client ID (from env) */
	clientId: string;
	/** OAuth client secret (from env) */
	clientSecret: string;
	/** OAuth scopes to request */
	scopes: TScopes;
	/** OAuth authorization URL */
	authUrl: string;
	/** OAuth token URL */
	tokenUrl: string;
	/** OAuth redirect URI */
	redirectUri: string;
	/** User info endpoint (optional) */
	userInfoUrl?: string;
};

// ============================================================================
// OAuth Errors
// ============================================================================

/**
 * Error thrown when an OAuth token has been permanently revoked.
 * This indicates the user needs to reconnect their account.
 * Common causes:
 * - User revoked access in their account settings
 * - Token was invalidated by the provider
 * - Refresh token expired (for providers with refresh token expiration)
 */
export class OAuthTokenRevokedError extends Error {
	readonly code = "TOKEN_REVOKED";

	constructor(
		message = "OAuth token has been revoked. Please reconnect your account.",
		public readonly provider?: string
	) {
		super(message);
		this.name = "OAuthTokenRevokedError";
	}
}

/**
 * Check if an error is an OAuthTokenRevokedError
 */
export const isOAuthTokenRevokedError = (error: unknown): error is OAuthTokenRevokedError => {
	return (
		error instanceof OAuthTokenRevokedError || (error instanceof Error && error.name === "OAuthTokenRevokedError")
	);
};
