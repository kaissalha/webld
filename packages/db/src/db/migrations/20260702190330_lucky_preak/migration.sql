CREATE TABLE "ai_chat_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"chat_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"order_index" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"summary" text NOT NULL,
	"tags" jsonb DEFAULT '[]' NOT NULL,
	"first_message_id" uuid NOT NULL,
	"last_message_id" uuid NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_chat_blocks_chat_order_unique" UNIQUE("chat_id","order_index")
);
--> statement-breakpoint
DROP INDEX "message_embedding_idx";--> statement-breakpoint
ALTER TABLE "ai_chat_messages" DROP COLUMN "embedding";--> statement-breakpoint
CREATE INDEX "ai_chat_blocks_chat_id_idx" ON "ai_chat_blocks" ("chat_id");--> statement-breakpoint
CREATE INDEX "ai_chat_blocks_organization_id_idx" ON "ai_chat_blocks" ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_chat_blocks_embedding_idx" ON "ai_chat_blocks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
ALTER TABLE "ai_chat_blocks" ADD CONSTRAINT "ai_chat_blocks_chat_id_ai_chats_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "ai_chats"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ai_chat_blocks" ADD CONSTRAINT "ai_chat_blocks_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;