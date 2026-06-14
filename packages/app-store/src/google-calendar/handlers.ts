import { betterFetch } from "@better-fetch/fetch";
import { and, eq } from "drizzle-orm";
import { OAuth2Client } from "google-auth-library";

import { db, oauthConnections } from "@starter/db";
import { logger } from "@starter/logger/server";

import { GOOGLE_CALENDAR_SCOPES, googleCalendarConfig } from "./config.ts";

export type GoogleCalendarOAuthState = {
	userId: string;
	organizationId: string;
};

export type GoogleCalendarConnectParams = {
	userId: string;
	organizationId: string;
};

export type GoogleCalendarCallbackParams = {
	code: string | null;
	state: string | null;
	error: string | null;
};

export type GoogleCalendarCallbackResult =
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

export const createGoogleCalendarAuthUrl = ({ userId, organizationId }: GoogleCalendarConnectParams): string => {
	const oauth2Client = new OAuth2Client(
		googleCalendarConfig.clientId,
		googleCalendarConfig.clientSecret,
		googleCalendarConfig.redirectUri
	);

	const state = Buffer.from(
		JSON.stringify({
			userId,
			organizationId,
		} satisfies GoogleCalendarOAuthState)
	).toString("base64url");

	return oauth2Client.generateAuthUrl({
		access_type: "offline",
		scope: [...GOOGLE_CALENDAR_SCOPES],
		prompt: "consent",
		state,
	});
};

export const handleGoogleCalendarCallback = async ({
	code,
	state,
	error,
}: GoogleCalendarCallbackParams): Promise<GoogleCalendarCallbackResult> => {
	if (error) {
		logger.error({
			message: "OAuth error returned from Google Calendar",
			metadata: {
				error,
			},
		});
		return { success: false, error: "oauth_denied" };
	}

	if (!code || !state) {
		return { success: false, error: "missing_params" };
	}

	let stateData: GoogleCalendarOAuthState;
	try {
		stateData = JSON.parse(Buffer.from(state, "base64url").toString()) as GoogleCalendarOAuthState;
	} catch {
		return { success: false, error: "invalid_state" };
	}

	const { userId, organizationId } = stateData;

	const oauth2Client = new OAuth2Client(
		googleCalendarConfig.clientId,
		googleCalendarConfig.clientSecret,
		googleCalendarConfig.redirectUri
	);

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
			message: "Failed to exchange Google Calendar OAuth code for tokens",
		});
		return { success: false, error: "token_exchange_failed" };
	}

	if (!tokens.access_token || !tokens.refresh_token) {
		return { success: false, error: "missing_tokens" };
	}

	oauth2Client.setCredentials(tokens);

	let userInfo: { email: string; name?: string; picture?: string; id: string };
	try {
		const { data, error: fetchError } = await betterFetch<{
			email: string;
			name?: string;
			picture?: string;
			id: string;
		}>(googleCalendarConfig.userInfoUrl ?? "", {
			headers: { Authorization: `Bearer ${tokens.access_token}` },
		});
		if (fetchError || !data) {
			throw new Error("Failed to fetch user info");
		}
		userInfo = data;
	} catch (err) {
		logger.error({
			error: err,
			message: "Failed to fetch Google Calendar OAuth user info",
		});
		return { success: false, error: "user_info_failed" };
	}

	const expiresAt = tokens.expiry_date
		? new Date(tokens.expiry_date).toISOString()
		: new Date(Date.now() + 3600 * 1000).toISOString();

	const existingConnection = await db
		.select()
		.from(oauthConnections)
		.where(
			and(
				eq(oauthConnections.externalId, userInfo.id),
				eq(oauthConnections.provider, "google_calendar"),
				eq(oauthConnections.organizationId, organizationId)
			)
		)
		.limit(1);

	let connectionId: string;

	if (existingConnection.length > 0) {
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
				scopes: [...GOOGLE_CALENDAR_SCOPES],
				updatedAt: new Date().toISOString(),
			})
			.where(eq(oauthConnections.id, connectionId));
	} else {
		const [inserted] = await db
			.insert(oauthConnections)
			.values({
				userId,
				organizationId,
				provider: "google_calendar",
				externalId: userInfo.id,
				email: userInfo.email,
				name: userInfo.name,
				picture: userInfo.picture,
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token,
				expiresAt,
				scopes: [...GOOGLE_CALENDAR_SCOPES],
				status: "connected",
			})
			.returning({ id: oauthConnections.id });
		connectionId = inserted.id;
	}

	return { success: true, connectionId };
};
