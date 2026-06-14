import { boolean, pgTable, text } from "drizzle-orm/pg-core";

import { timeFields } from "../helpers/time.ts";

export const users = pgTable("users", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull().default(false),
	image: text("image"),
	twoFactorEnabled: boolean("two_factor_enabled").default(false),
	...timeFields,
});

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
