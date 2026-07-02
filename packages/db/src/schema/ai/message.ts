import { index, jsonb, pgEnum, pgTable, uuid } from "drizzle-orm/pg-core";

import { timeFields } from "../helpers/time.ts";
import { aiChats } from "./chat.ts";

export const messageRole = pgEnum("message_role", ["user", "assistant", "system"]);

/**
 * This should contain all information required to reconstruct a ai-sdk UIMessage
 */
export const aiChatMessages = pgTable(
	"ai_chat_messages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		chatId: uuid("chat_id")
			.notNull()
			.references(() => aiChats.id, { onDelete: "cascade" }),
		role: messageRole("role").notNull(),
		parts: jsonb("parts").notNull().$type<Array<{ type: string; [key: string]: unknown }>>(),
		...timeFields,
	},
	(table) => [index("message_chat_id_idx").on(table.chatId), index("message_created_at_idx").on(table.createdAt)]
);

// Types
export type DbChatMessage = typeof aiChatMessages.$inferSelect;
export type DbChatNewMessage = typeof aiChatMessages.$inferInsert;
