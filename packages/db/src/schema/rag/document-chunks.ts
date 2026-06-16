import { type SQL, sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, unique, uuid, vector } from "drizzle-orm/pg-core";

import { organizations } from "../auth/organizations.ts";
import { timeFields } from "../helpers/time.ts";
import { tsvector } from "../helpers/tsvector.ts";
import { ragDocuments } from "./documents.ts";

export const ragDocumentChunks = pgTable(
	"rag_document_chunks",
	{
		id: uuid("id").primaryKey().defaultRandom().notNull(),
		documentId: uuid("document_id")
			.notNull()
			.references(() => ragDocuments.id, { onDelete: "cascade" }),
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
			.generatedAlwaysAs(
				(): SQL => sql`to_tsvector('english'::regconfig, COALESCE(${ragDocumentChunks.content}, ''))`
			),
	},
	(table) => [
		index("rag_document_chunks_document_id_idx").on(table.documentId),
		index("rag_document_chunks_organization_id_idx").on(table.organizationId),
		index("rag_document_chunks_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
		index("rag_document_chunks_fts_idx").using("gin", table.fts.asc().nullsLast().op("tsvector_ops")),
		unique("rag_document_chunks_document_chunk_idx").on(table.documentId, table.chunkIndex),
	]
);

export type RagDocumentChunk = typeof ragDocumentChunks.$inferSelect;
export type NewRagDocumentChunk = typeof ragDocumentChunks.$inferInsert;
