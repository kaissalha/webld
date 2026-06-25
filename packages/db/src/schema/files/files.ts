import { type SQL, sql } from "drizzle-orm";
import { bigint, date, index, jsonb, pgEnum, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";

import { organizations } from "../auth/organizations.ts";
import { users } from "../auth/users.ts";
import { deletedFields } from "../helpers/deleted.ts";
import { timeFields } from "../helpers/time.ts";
import { tsvector } from "../helpers/tsvector.ts";

export const fileAccess = pgEnum("file_access", ["public", "private"]);
export const fileAccessValues = fileAccess.enumValues;

export const fileKind = pgEnum("file_kind", ["document", "image", "text", "audio", "video", "other"]);
export const fileKindValues = fileKind.enumValues;

export const fileSourceType = pgEnum("file_source_type", ["upload", "text", "url"]);
export const fileSourceTypeValues = fileSourceType.enumValues;

export const fileRagStatus = pgEnum("file_rag_status", ["none", "pending", "ready", "failed"]);
export const fileRagStatusValues = fileRagStatus.enumValues;

/**
 * Free-form, kind-specific attributes. Sparse and not queried relationally —
 * promote a field to a real column only when it needs filtering/sorting at scale.
 */
export type FileMetadata = {
	// images
	width?: number;
	height?: number;
	thumbnailUrl?: string;
	blurhash?: string;
	exif?: Record<string, unknown>;
	// audio / video
	durationSec?: number;
	// documents
	pageCount?: number;
	wordCount?: number;
	// semantic (any non-text file) — ocrText/summary get embedded as a chunk
	ocrText?: string;
	altText?: string;
	// provenance
	originalFilename?: string;
	sourceUrl?: string;
};

/**
 * The vault's atomic unit: one row per file. Absorbs the old `uploaded_media`
 * (blob pointer + access) and `rag_documents` (knowledge unit + status).
 * The blob is usable the moment the row exists; `ragStatus` tracks indexing
 * independently of whether the file is downloadable.
 */
export const files = pgTable(
	"files",
	{
		id: uuid("id").primaryKey().defaultRandom().notNull(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		uploadedBy: text("uploaded_by").references(() => users.id, { onDelete: "set null" }),

		// physical file
		name: text("name").notNull(),
		url: text("url"), // nullable — text-only items have no blob
		contentType: text("content_type").notNull(),
		sizeBytes: bigint("size_bytes", { mode: "number" }),
		access: fileAccess("access").notNull().default("public"),
		kind: fileKind("kind").notNull().default("other"),

		// provenance
		sourceType: fileSourceType("source_type").notNull().default("upload"),
		contentHash: varchar("content_hash", { length: 64 }),

		// enrichment (AI-generated; null on soft-fail)
		title: text("title"),
		summary: text("summary"),
		docDate: date("doc_date"),
		language: text("language"),

		// processing
		ragStatus: fileRagStatus("rag_status").notNull().default("none"),
		processingError: text("processing_error"),
		ingestRunId: text("ingest_run_id"), // Workflow DevKit run id, for observability

		metadata: jsonb("metadata").notNull().$type<FileMetadata>().default({}),
		...timeFields,
		...deletedFields,

		fts: tsvector("fts")
			.notNull()
			.generatedAlwaysAs(
				(): SQL =>
					sql`to_tsvector('english'::regconfig, ((COALESCE(${files.title}, '') || ' ' || COALESCE(${files.name}, '')) || ' ' || COALESCE(${files.summary}, '')))`
			),
	},
	(table) => [
		index("files_organization_id_idx").on(table.organizationId),
		index("files_org_rag_status_idx").on(table.organizationId, table.ragStatus),
		index("files_org_created_at_idx").on(table.organizationId, table.createdAt),
		index("files_content_hash_idx").on(table.contentHash),
		index("files_url_idx").on(table.url),
		index("files_fts_idx").using("gin", table.fts.asc().nullsLast().op("tsvector_ops")),
	]
);

export type FileRecord = typeof files.$inferSelect;
export type NewFileRecord = typeof files.$inferInsert;
export type FileAccess = (typeof fileAccessValues)[number];
export type FileKind = (typeof fileKindValues)[number];
export type FileSourceType = (typeof fileSourceTypeValues)[number];
export type FileRagStatus = (typeof fileRagStatusValues)[number];
