import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { timeFields } from "../helpers/time.ts";
import { aiChats } from "./chat.ts";

export const aiChatStreams = pgTable(
	"ai_chat_streams",
	{
		id: uuid("id").primaryKey().notNull().defaultRandom(),
		chatId: uuid("chat_id")
			.notNull()
			.references(() => aiChats.id, { onDelete: "cascade" }),
		canceledAt: timestamp("canceled_at", { withTimezone: true, mode: "string" }),
		...timeFields,
	},
	(table) => [index("stream_chat_id_idx").on(table.chatId), index("stream_created_at_idx").on(table.createdAt)]
);

// Types
export type Stream = typeof aiChatStreams.$inferSelect;
export type NewStream = typeof aiChatStreams.$inferInsert;
