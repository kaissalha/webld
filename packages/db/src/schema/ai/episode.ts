import { index, jsonb, pgTable, text, unique, uuid, vector } from "drizzle-orm/pg-core";

import { organizations } from "../auth/organizations.ts";
import { timeFields } from "../helpers/time.ts";
import { aiChats } from "./chat.ts";

export const chatEpisodes = pgTable(
	"chat_episodes",
	{
		id: uuid("id").primaryKey().defaultRandom().notNull(),
		chatId: uuid("chat_id")
			.notNull()
			.references(() => aiChats.id, { onDelete: "cascade" }),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		summary: text("summary").notNull(),
		tags: jsonb("tags").notNull().$type<string[]>().default([]),
		whatWorkedWell: text("what_worked_well").notNull(),
		whatToAvoid: text("what_to_avoid").notNull(),
		embedding: vector("embedding", { dimensions: 1536 }).notNull(),
		...timeFields,
	},
	(table) => [
		unique("chat_episodes_chat_id_unique").on(table.chatId),
		index("chat_episodes_organization_id_idx").on(table.organizationId),
		index("chat_episodes_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
	]
);

export type ChatEpisode = typeof chatEpisodes.$inferSelect;
export type NewChatEpisode = typeof chatEpisodes.$inferInsert;
