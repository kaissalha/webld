import { index, pgTable, text } from "drizzle-orm/pg-core";

import { users } from "./users.ts";

export const twoFactors = pgTable(
	"two_factors",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		secret: text("secret").notNull(),
		backupCodes: text("backup_codes").notNull(),
	},
	(table) => [index("two_factors_secret_idx").on(table.secret), index("two_factors_user_id_idx").on(table.userId)]
);

// Types
export type TwoFactor = typeof twoFactors.$inferSelect;
export type NewTwoFactor = typeof twoFactors.$inferInsert;
