import { index, jsonb, pgEnum, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";

import { organizations } from "../auth/organizations.ts";
import { timeFields } from "../helpers/time.ts";

export const ragDocumentSourceType = pgEnum("rag_document_source_type", ["text", "file", "url"]);
export const ragDocumentStatus = pgEnum("rag_document_status", ["pending", "ready", "failed"]);

export const ragDocuments = pgTable(
	"rag_documents",
	{
		id: uuid("id").primaryKey().defaultRandom().notNull(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		source: text("source"),
		sourceType: ragDocumentSourceType("source_type").notNull().default("text"),
		status: ragDocumentStatus("status").notNull().default("ready"),
		contentHash: varchar("content_hash", { length: 64 }),
		error: text("error"),
		metadata: jsonb("metadata").notNull().$type<Record<string, unknown>>().default({}),
		...timeFields,
	},
	(table) => [
		index("rag_documents_organization_id_idx").on(table.organizationId),
		index("rag_documents_organization_status_idx").on(table.organizationId, table.status),
	]
);

export type RagDocument = typeof ragDocuments.$inferSelect;
export type NewRagDocument = typeof ragDocuments.$inferInsert;
