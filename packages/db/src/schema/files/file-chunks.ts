import { type SQL, sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, unique, uuid, vector } from "drizzle-orm/pg-core";

import { organizations } from "../auth/organizations.ts";
import { timeFields } from "../helpers/time.ts";
import { tsvector } from "../helpers/tsvector.ts";
import { files } from "./files.ts";

export const fileChunks = pgTable(
	"file_chunks",
	{
		id: uuid("id").primaryKey().defaultRandom().notNull(),
		fileId: uuid("file_id")
			.notNull()
			.references(() => files.id, { onDelete: "cascade" }),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		chunkIndex: integer("chunk_index").notNull(),
		content: text("content").notNull(),
		embedding: vector("embedding", { dimensions: 1536 }).notNull(),
		metadata: jsonb("metadata").notNull().$type<Record<string, unknown>>().default({}),
		...timeFields,
		fts: tsvector("fts")
			.notNull()
			.generatedAlwaysAs((): SQL => sql`to_tsvector('english'::regconfig, COALESCE(${fileChunks.content}, ''))`),
	},
	(table) => [
		index("file_chunks_file_id_idx").on(table.fileId),
		index("file_chunks_organization_id_idx").on(table.organizationId),
		index("file_chunks_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
		index("file_chunks_fts_idx").using("gin", table.fts.asc().nullsLast().op("tsvector_ops")),
		unique("file_chunks_file_chunk_idx").on(table.fileId, table.chunkIndex),
	]
);

export type FileChunk = typeof fileChunks.$inferSelect;
export type NewFileChunk = typeof fileChunks.$inferInsert;
