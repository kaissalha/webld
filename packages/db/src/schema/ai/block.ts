import { index, integer, jsonb, pgTable, text, unique, uuid, varchar, vector } from "drizzle-orm/pg-core";

import { organizations } from "../auth/organizations.ts";
import { timeFields } from "../helpers/time.ts";
import { aiChats } from "./chat.ts";

/**
 * A compacted span of chat history: the model sees the titled summary in every
 * turn, and can pull the verbatim messages back via the recall tool. Blocks
 * partition the compacted prefix of a chat exactly - each block ends where the
 * next begins.
 */
export const aiChatBlocks = pgTable(
	"ai_chat_blocks",
	{
		id: uuid("id").primaryKey().defaultRandom().notNull(),
		chatId: uuid("chat_id")
			.notNull()
			.references(() => aiChats.id, { onDelete: "cascade" }),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		orderIndex: integer("order_index").notNull(),
		title: varchar("title", { length: 200 }).notNull(),
		summary: text("summary").notNull(),
		tags: jsonb("tags").notNull().$type<string[]>().default([]),
		firstMessageId: uuid("first_message_id").notNull(),
		lastMessageId: uuid("last_message_id").notNull(),
		embedding: vector("embedding", { dimensions: 1536 }).notNull(),
		...timeFields,
	},
	(table) => [
		unique("ai_chat_blocks_chat_order_unique").on(table.chatId, table.orderIndex),
		index("ai_chat_blocks_chat_id_idx").on(table.chatId),
		index("ai_chat_blocks_organization_id_idx").on(table.organizationId),
		index("ai_chat_blocks_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
	]
);

export type ChatBlock = typeof aiChatBlocks.$inferSelect;
export type NewChatBlock = typeof aiChatBlocks.$inferInsert;
