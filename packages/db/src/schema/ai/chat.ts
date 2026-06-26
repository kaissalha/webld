import { index, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";

import { organizations } from "../auth/organizations.ts";
import { timeFields } from "../helpers/time.ts";

export const aiChats = pgTable(
	"ai_chats",
	{
		id: uuid("id").primaryKey().notNull().defaultRandom(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		title: varchar("title", { length: 100 }).notNull(),
		lastStreamId: uuid("last_stream_id"),
		...timeFields,
	},
	(table) => [
		index("chat_organization_id_idx").on(table.organizationId),
		index("chat_created_at_idx").on(table.createdAt),
	]
);

// Types
export type Chat = typeof aiChats.$inferSelect;
export type NewChat = typeof aiChats.$inferInsert;
