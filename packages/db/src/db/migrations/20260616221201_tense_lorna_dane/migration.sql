CREATE TYPE "memory_source" AS ENUM('chat', 'onboarding', 'manual');--> statement-breakpoint
CREATE TABLE "chat_episodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"chat_id" uuid NOT NULL CONSTRAINT "chat_episodes_chat_id_unique" UNIQUE,
	"organization_id" text NOT NULL,
	"summary" text NOT NULL,
	"tags" jsonb DEFAULT '[]' NOT NULL,
	"what_worked_well" text NOT NULL,
	"what_to_avoid" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" text NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"source" "memory_source" DEFAULT 'chat'::"memory_source" NOT NULL,
	"source_chat_id" uuid,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_chat_messages" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
CREATE INDEX "chat_episodes_organization_id_idx" ON "chat_episodes" ("organization_id");--> statement-breakpoint
CREATE INDEX "chat_episodes_embedding_idx" ON "chat_episodes" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "memories_organization_id_idx" ON "memories" ("organization_id");--> statement-breakpoint
CREATE INDEX "memories_source_idx" ON "memories" ("source");--> statement-breakpoint
CREATE INDEX "memories_embedding_idx" ON "memories" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "message_embedding_idx" ON "ai_chat_messages" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
ALTER TABLE "chat_episodes" ADD CONSTRAINT "chat_episodes_chat_id_ai_chats_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "ai_chats"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_episodes" ADD CONSTRAINT "chat_episodes_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_source_chat_id_ai_chats_id_fkey" FOREIGN KEY ("source_chat_id") REFERENCES "ai_chats"("id") ON DELETE SET NULL;