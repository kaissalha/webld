import { index, pgEnum, pgTable, text, uuid, varchar, vector } from "drizzle-orm/pg-core";

import { organizations } from "../auth/organizations.ts";
import { timeFields } from "../helpers/time.ts";
import { aiChats } from "./chat.ts";

export const memorySource = pgEnum("memory_source", ["chat", "onboarding", "manual"]);

export const memories = pgTable(
	"memories",
	{
		id: uuid("id").primaryKey().defaultRandom().notNull(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		title: varchar("title", { length: 200 }).notNull(),
		content: text("content").notNull(),
		source: memorySource("source").notNull().default("chat"),
		sourceChatId: uuid("source_chat_id").references(() => aiChats.id, { onDelete: "set null" }),
		embedding: vector("embedding", { dimensions: 1536 }).notNull(),
		...timeFields,
	},
	(table) => [
		index("memories_organization_id_idx").on(table.organizationId),
		index("memories_source_idx").on(table.source),
		index("memories_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
	]
);

export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;
