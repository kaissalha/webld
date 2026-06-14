import { betterFetch } from "@better-fetch/fetch";
import { and, eq } from "drizzle-orm";
import { OAuth2Client } from "google-auth-library";

import { db, oauthConnections } from "@webld/db";
import { logger } from "@webld/logger/server";

import { GMAIL_SCOPES, gmailConfig } from "./config.ts";

// ============================================================================
// Types
// ============================================================================

export type OAuthState = {
	userId: string;
	organizationId: string;
};

export type ConnectParams = {
	userId: string;
	organizationId: string;
};

export type CallbackParams = {
	code: string | null;
	state: string | null;
	error: string | null;
};

export type CallbackResult =
	| { success: true; connectionId: string }
	| {
			success: false;
			error:
				| "oauth_denied"
				| "missing_params"
				| "invalid_state"
				| "token_exchange_failed"
				| "missing_tokens"
				| "user_info_failed";
	  };

// ============================================================================
// Connect Handler
// ============================================================================

/**
 * Generates the Gmail OAuth authorization URL
 */
export const createGmailAuthUrl = ({ userId, organizationId }: ConnectParams): string => {
	const oauth2Client = new OAuth2Client(gmailConfig.clientId, gmailConfig.clientSecret, gmailConfig.redirectUri);

	const state = Buffer.from(
		JSON.stringify({
			userId,
			organizationId,
		} satisfies OAuthState)
	).toString("base64url");

	return oauth2Client.generateAuthUrl({
		access_type: "offline",
		scope: [...GMAIL_SCOPES],
		prompt: "consent",
		state,
	});
};

// ============================================================================
// Callback Handler
// ============================================================================

/**
 * Handles the Gmail OAuth callback - exchanges code for tokens and saves connection
 */
export const handleGmailCallback = async ({ code, state, error }: CallbackParams): Promise<CallbackResult> => {
	if (error) {
		logger.error({
			message: "OAuth error returned from Gmail",
			metadata: {
				error,
			},
		});
		return { success: false, error: "oauth_denied" };
	}

	if (!code || !state) {
		return { success: false, error: "missing_params" };
	}

	// Decode state
	let stateData: OAuthState;
	try {
		stateData = JSON.parse(Buffer.from(state, "base64url").toString()) as OAuthState;
	} catch {
		return { success: false, error: "invalid_state" };
	}

	const { userId, organizationId } = stateData;

	// Exchange code for tokens
	const oauth2Client = new OAuth2Client(gmailConfig.clientId, gmailConfig.clientSecret, gmailConfig.redirectUri);

	let tokens: {
		access_token?: string | null;
		refresh_token?: string | null;
		expiry_date?: number | null;
	};

	try {
		const response = await oauth2Client.getToken(code);
		tokens = response.tokens;
	} catch (err) {
		logger.error({
			error: err,
			message: "Failed to exchange Gmail OAuth code for tokens",
		});
		return { success: false, error: "token_exchange_failed" };
	}

	if (!tokens.access_token || !tokens.refresh_token) {
		return { success: false, error: "missing_tokens" };
	}

	// Get user info
	oauth2Client.setCredentials(tokens);

	let userInfo: { email: string; name?: string; picture?: string; id: string };
	try {
		const { data, error: fetchError } = await betterFetch<{
			email: string;
			name?: string;
			picture?: string;
			id: string;
		}>(gmailConfig.userInfoUrl ?? "", {
			headers: { Authorization: `Bearer ${tokens.access_token}` },
		});
		if (fetchError || !data) {
			throw new Error("Failed to fetch user info");
		}
		userInfo = data;
	} catch (err) {
		logger.error({
			error: err,
			message: "Failed to fetch Gmail OAuth user info",
		});
		return { success: false, error: "user_info_failed" };
	}

	// Check if connection already exists
	const existingConnection = await db
		.select()
		.from(oauthConnections)
		.where(
			and(
				eq(oauthConnections.externalId, userInfo.id),
				eq(oauthConnections.provider, "gmail"),
				eq(oauthConnections.organizationId, organizationId)
			)
		)
		.limit(1);

	const expiresAt = tokens.expiry_date
		? new Date(tokens.expiry_date).toISOString()
		: new Date(Date.now() + 3600 * 1000).toISOString();

	let connectionId: string;

	if (existingConnection.length > 0) {
		// Update existing connection
		connectionId = existingConnection[0].id;
		await db
			.update(oauthConnections)
			.set({
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token,
				expiresAt,
				status: "connected",
				email: userInfo.email,
				name: userInfo.name,
				picture: userInfo.picture,
				scopes: [...GMAIL_SCOPES],
				updatedAt: new Date().toISOString(),
			})
			.where(eq(oauthConnections.id, connectionId));
	} else {
		// Create new connection
		const [inserted] = await db
			.insert(oauthConnections)
			.values({
				userId,
				organizationId,
				provider: "gmail",
				externalId: userInfo.id,
				email: userInfo.email,
				name: userInfo.name,
				picture: userInfo.picture,
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token,
				expiresAt,
				scopes: [...GMAIL_SCOPES],
				status: "connected",
			})
			.returning({ id: oauthConnections.id });
		connectionId = inserted.id;
	}

	return { success: true, connectionId };
};
