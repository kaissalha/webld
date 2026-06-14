import { sql } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { organizations } from "../auth/organizations.ts";
import { users } from "../auth/users.ts";
import { timeFields } from "../helpers/time.ts";

export const oauthProviderEnum = pgEnum("oauth_provider", ["gmail", "google_calendar"]);

export const oauthProviderEnumValues = oauthProviderEnum.enumValues;

export const oauthConnectionStatusEnum = pgEnum("oauth_connection_status", [
	"connected",
	"disconnected",
	"error",
	"expired",
]);

export const oauthConnections = pgTable(
	"oauth_connections",
	{
		id: uuid("id").defaultRandom().primaryKey().notNull(),

		// Ownership
		// If userId is NULL -> organization-level connection (shared across org)
		// If userId is SET -> user-level connection (personal to user)
		userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),

		// Provider info
		provider: oauthProviderEnum("provider").notNull(),
		externalId: text("external_id").notNull(), // Provider's user/account ID

		// User profile from provider
		email: text("email").notNull(),
		name: text("name"),
		picture: text("picture"),

		// OAuth tokens
		accessToken: text("access_token").notNull(),
		refreshToken: text("refresh_token").notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
		scopes: text("scopes").array(), // Granted OAuth scopes (e.g., gmail.readonly, gmail.send)

		// Connection status
		status: oauthConnectionStatusEnum("status").default("connected").notNull(),

		// Sync state (for incremental sync like Gmail History API)
		syncToken: text("sync_token"), // Gmail: historyId, Outlook: deltaToken
		syncedAt: timestamp("synced_at", { withTimezone: true, mode: "string" }),

		// Watch/Push notification state (Gmail Pub/Sub, Outlook webhooks)
		watchId: text("watch_id"), // Channel/subscription ID
		watchResourceId: text("watch_resource_id"), // Resource being watched
		watchExpiration: timestamp("watch_expiration", { withTimezone: true, mode: "string" }),

		// Activity tracking
		lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true, mode: "string" }),

		...timeFields,
	},
	(table) => [
		// Partial unique index for organization-level connections (userId IS NULL)
		// One org-level connection per external account per org
		uniqueIndex("oauth_connection_org_level_unique")
			.on(table.externalId, table.provider, table.organizationId)
			.where(sql`${table.userId} IS NULL`),

		// Partial unique index for user-level connections (userId IS NOT NULL)
		// One user-level connection per external account per org per user
		uniqueIndex("oauth_connection_user_level_unique")
			.on(table.externalId, table.provider, table.organizationId, table.userId)
			.where(sql`${table.userId} IS NOT NULL`),

		// Lookup indexes
		index("oauth_connection_user_id_idx").on(table.userId),
		index("oauth_connection_org_id_idx").on(table.organizationId),

		// Watch expiration index (for renewal jobs)
		index("oauth_connection_watch_expiration_idx").on(table.watchExpiration),
	]
);

// ============================================================================
// Types
// ============================================================================

export type OAuthConnection = typeof oauthConnections.$inferSelect;
export type NewOAuthConnection = typeof oauthConnections.$inferInsert;
export type OAuthProvider = (typeof oauthProviderEnum.enumValues)[number];
export type OAuthConnectionStatus = (typeof oauthConnectionStatusEnum.enumValues)[number];
