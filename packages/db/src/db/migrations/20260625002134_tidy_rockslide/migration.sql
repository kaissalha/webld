CREATE TYPE "file_access" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "file_kind" AS ENUM('document', 'image', 'text', 'audio', 'video', 'other');--> statement-breakpoint
CREATE TYPE "file_rag_status" AS ENUM('none', 'pending', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "file_source_type" AS ENUM('upload', 'text', 'url');--> statement-breakpoint
CREATE TABLE "file_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"file_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fts" tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, COALESCE("file_chunks"."content", ''))) STORED NOT NULL,
	CONSTRAINT "file_chunks_file_chunk_idx" UNIQUE("file_id","chunk_index")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" text NOT NULL,
	"uploaded_by" text,
	"name" text NOT NULL,
	"url" text,
	"content_type" text NOT NULL,
	"size_bytes" bigint,
	"access" "file_access" DEFAULT 'public'::"file_access" NOT NULL,
	"kind" "file_kind" DEFAULT 'other'::"file_kind" NOT NULL,
	"source_type" "file_source_type" DEFAULT 'upload'::"file_source_type" NOT NULL,
	"content_hash" varchar(64),
	"title" text,
	"summary" text,
	"doc_date" date,
	"language" text,
	"rag_status" "file_rag_status" DEFAULT 'none'::"file_rag_status" NOT NULL,
	"processing_error" text,
	"ingest_run_id" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_by" text,
	"deleted_at" timestamp with time zone,
	"fts" tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, ((COALESCE("files"."title", '') || ' ' || COALESCE("files"."name", '')) || ' ' || COALESCE("files"."summary", '')))) STORED NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_tag_assignments" (
	"file_id" uuid,
	"tag_id" uuid,
	"organization_id" text NOT NULL,
	CONSTRAINT "file_tag_assignments_pkey" PRIMARY KEY("file_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "file_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_tags_org_slug_idx" UNIQUE("organization_id","slug")
);
--> statement-breakpoint
ALTER TABLE "rag_document_chunks" DROP CONSTRAINT "rag_document_chunks_document_id_rag_documents_id_fkey";--> statement-breakpoint
DROP TABLE "uploaded_media";--> statement-breakpoint
DROP TABLE "rag_document_chunks";--> statement-breakpoint
DROP TABLE "rag_documents";--> statement-breakpoint
CREATE INDEX "file_chunks_file_id_idx" ON "file_chunks" ("file_id");--> statement-breakpoint
CREATE INDEX "file_chunks_organization_id_idx" ON "file_chunks" ("organization_id");--> statement-breakpoint
CREATE INDEX "file_chunks_embedding_idx" ON "file_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "file_chunks_fts_idx" ON "file_chunks" USING gin ("fts" tsvector_ops);--> statement-breakpoint
CREATE INDEX "files_organization_id_idx" ON "files" ("organization_id");--> statement-breakpoint
CREATE INDEX "files_org_rag_status_idx" ON "files" ("organization_id","rag_status");--> statement-breakpoint
CREATE INDEX "files_org_created_at_idx" ON "files" ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "files_content_hash_idx" ON "files" ("content_hash");--> statement-breakpoint
CREATE INDEX "files_url_idx" ON "files" ("url");--> statement-breakpoint
CREATE INDEX "files_fts_idx" ON "files" USING gin ("fts" tsvector_ops);--> statement-breakpoint
CREATE INDEX "file_tag_assignments_tag_id_idx" ON "file_tag_assignments" ("tag_id");--> statement-breakpoint
CREATE INDEX "file_tag_assignments_organization_id_idx" ON "file_tag_assignments" ("organization_id");--> statement-breakpoint
CREATE INDEX "file_tags_organization_id_idx" ON "file_tags" ("organization_id");--> statement-breakpoint
ALTER TABLE "file_chunks" ADD CONSTRAINT "file_chunks_file_id_files_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "file_chunks" ADD CONSTRAINT "file_chunks_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_deleted_by_users_id_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "file_tag_assignments" ADD CONSTRAINT "file_tag_assignments_file_id_files_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "file_tag_assignments" ADD CONSTRAINT "file_tag_assignments_tag_id_file_tags_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "file_tags"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "file_tag_assignments" ADD CONSTRAINT "file_tag_assignments_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "file_tags" ADD CONSTRAINT "file_tags_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
DROP TYPE "uploaded_media_access";--> statement-breakpoint
DROP TYPE "rag_document_source_type";--> statement-breakpoint
DROP TYPE "rag_document_status";