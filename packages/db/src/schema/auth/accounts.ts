import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { timeFields } from "../helpers/time.ts";
import { users } from "./users.ts";

export const accounts = pgTable(
	"accounts",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true, mode: "string" }),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true, mode: "string" }),
		scope: text("scope"),
		password: text("password"),
		...timeFields,
	},
	(table) => [index("account_user_id_idx").on(table.userId)]
);

// Types
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
