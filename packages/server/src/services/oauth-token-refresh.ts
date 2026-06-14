import { and, eq, inArray, lte } from "drizzle-orm";

import {
	isOAuthTokenRevokedError,
	oauthProvidersWithAccessTokenRefresh,
	refreshOAuthProviderAccessToken,
} from "@starter/app-store";
import { db, type OAuthConnection, oauthConnections } from "@starter/db";
import { logger } from "@starter/logger/server";

export const refreshStoredOAuthAccessToken = async (connection: OAuthConnection) => {
	const now = new Date();

	try {
		const { accessToken: newAccessToken, expiresAt: newExpiresAt } = await refreshOAuthProviderAccessToken({
			provider: connection.provider,
			accessToken: connection.accessToken,
			refreshToken: connection.refreshToken,
			email: connection.email,
		});

		await db
			.update(oauthConnections)
			.set({
				accessToken: newAccessToken,
				expiresAt: newExpiresAt.toISOString(),
				lastAccessedAt: now.toISOString(),
			})
			.where(eq(oauthConnections.id, connection.id));

		return newAccessToken;
	} catch (error) {
		logger.error({
			error,
			message: "Failed to refresh OAuth access token",
			metadata: {
				connectionId: connection.id,
				provider: connection.provider,
			},
		});

		if (isOAuthTokenRevokedError(error)) {
			await db.update(oauthConnections).set({ status: "expired" }).where(eq(oauthConnections.id, connection.id));
			throw error;
		}

		throw new Error("Failed to refresh OAuth access token. Please reconnect your account.");
	}
};

export const runOAuthTokenRefreshJob = async ({
	expiresWithinMinutes = 30,
	limit = 200,
}: {
	expiresWithinMinutes?: number;
	limit?: number;
} = {}) => {
	if (oauthProvidersWithAccessTokenRefresh.length === 0) {
		return { examined: 0, refreshed: 0, failed: 0 };
	}

	const threshold = new Date(Date.now() + expiresWithinMinutes * 60 * 1000).toISOString();

	const connections = await db
		.select()
		.from(oauthConnections)
		.where(
			and(
				eq(oauthConnections.status, "connected"),
				inArray(oauthConnections.provider, [...oauthProvidersWithAccessTokenRefresh]),
				lte(oauthConnections.expiresAt, threshold)
			)
		)
		.limit(limit);

	const result = { examined: connections.length, refreshed: 0, failed: 0 };

	for (const connection of connections) {
		try {
			await refreshStoredOAuthAccessToken(connection);
			result.refreshed += 1;
		} catch {
			result.failed += 1;
		}
	}

	return result;
};
