CREATE EXTENSION vector;
CREATE TYPE "message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "oauth_connection_status" AS ENUM('connected', 'disconnected', 'error', 'expired');--> statement-breakpoint
CREATE TYPE "oauth_provider" AS ENUM('gmail', 'google_calendar');--> statement-breakpoint
CREATE TYPE "uploaded_media_access" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "rag_document_source_type" AS ENUM('text', 'file', 'url');--> statement-breakpoint
CREATE TYPE "rag_document_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "ai_chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" text NOT NULL,
	"title" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"chat_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"parts" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_chat_streams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"chat_id" uuid NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"inviter_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"metadata" text,
	"stripe_customer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL UNIQUE,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_factors" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"two_factor_enabled" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fts" tsvector GENERATED ALWAYS AS (
						to_tsvector(
							'english'::regconfig,
							COALESCE("contacts"."first_name", '') || ' ' ||
							COALESCE("contacts"."last_name", '') || ' ' ||
							COALESCE("contacts"."email", '') || ' ' ||
							COALESCE("contacts"."phone_number", '')
						)
					) STORED NOT NULL,
	CONSTRAINT "contact_organization_email_idx" UNIQUE("organization_id","email")
);
--> statement-breakpoint
CREATE TABLE "oauth_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text,
	"organization_id" text NOT NULL,
	"provider" "oauth_provider" NOT NULL,
	"external_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"picture" text,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"scopes" text[],
	"status" "oauth_connection_status" DEFAULT 'connected'::"oauth_connection_status" NOT NULL,
	"sync_token" text,
	"synced_at" timestamp with time zone,
	"watch_id" text,
	"watch_resource_id" text,
	"watch_expiration" timestamp with time zone,
	"last_accessed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" text NOT NULL,
	"url" text NOT NULL,
	"content_type" text NOT NULL,
	"access" "uploaded_media_access" DEFAULT 'public'::"uploaded_media_access" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rag_document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"document_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rag_document_chunks_document_chunk_idx" UNIQUE("document_id","chunk_index")
);
--> statement-breakpoint
CREATE TABLE "rag_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"source" text,
	"source_type" "rag_document_source_type" DEFAULT 'text'::"rag_document_source_type" NOT NULL,
	"status" "rag_document_status" DEFAULT 'ready'::"rag_document_status" NOT NULL,
	"content_hash" varchar(64),
	"error" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY,
	"plan" text NOT NULL,
	"reference_id" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" text DEFAULT 'incomplete' NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"trial_start" timestamp with time zone,
	"trial_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false,
	"cancel_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"seats" integer,
	"billing_interval" text,
	"stripe_schedule_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "chat_organization_id_idx" ON "ai_chats" ("organization_id");--> statement-breakpoint
CREATE INDEX "chat_created_at_idx" ON "ai_chats" ("created_at");--> statement-breakpoint
CREATE INDEX "message_chat_id_idx" ON "ai_chat_messages" ("chat_id");--> statement-breakpoint
CREATE INDEX "message_created_at_idx" ON "ai_chat_messages" ("created_at");--> statement-breakpoint
CREATE INDEX "stream_chat_id_idx" ON "ai_chat_streams" ("chat_id");--> statement-breakpoint
CREATE INDEX "stream_created_at_idx" ON "ai_chat_streams" ("created_at");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "accounts" ("user_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitations" ("email");--> statement-breakpoint
CREATE INDEX "invitation_organization_id_idx" ON "invitations" ("organization_id");--> statement-breakpoint
CREATE INDEX "member_user_id_idx" ON "members" ("user_id");--> statement-breakpoint
CREATE INDEX "member_organization_id_idx" ON "members" ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_slug_idx" ON "organizations" ("slug");--> statement-breakpoint
CREATE INDEX "organization_stripe_customer_id_idx" ON "organizations" ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "sessions" ("token");--> statement-breakpoint
CREATE INDEX "two_factors_secret_idx" ON "two_factors" ("secret");--> statement-breakpoint
CREATE INDEX "two_factors_user_id_idx" ON "two_factors" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verifications" ("identifier");--> statement-breakpoint
CREATE INDEX "contact_organization_id_idx" ON "contacts" ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_contacts_fts" ON "contacts" USING gin ("fts" tsvector_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_connection_org_level_unique" ON "oauth_connections" ("external_id","provider","organization_id") WHERE "user_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_connection_user_level_unique" ON "oauth_connections" ("external_id","provider","organization_id","user_id") WHERE "user_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "oauth_connection_user_id_idx" ON "oauth_connections" ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_connection_org_id_idx" ON "oauth_connections" ("organization_id");--> statement-breakpoint
CREATE INDEX "oauth_connection_watch_expiration_idx" ON "oauth_connections" ("watch_expiration");--> statement-breakpoint
CREATE INDEX "uploaded_media_organization_id_idx" ON "uploaded_media" ("organization_id");--> statement-breakpoint
CREATE INDEX "uploaded_media_url_idx" ON "uploaded_media" ("url");--> statement-breakpoint
CREATE INDEX "uploaded_media_created_at_idx" ON "uploaded_media" ("created_at");--> statement-breakpoint
CREATE INDEX "rag_document_chunks_document_id_idx" ON "rag_document_chunks" ("document_id");--> statement-breakpoint
CREATE INDEX "rag_document_chunks_organization_id_idx" ON "rag_document_chunks" ("organization_id");--> statement-breakpoint
CREATE INDEX "rag_document_chunks_embedding_idx" ON "rag_document_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "rag_documents_organization_id_idx" ON "rag_documents" ("organization_id");--> statement-breakpoint
CREATE INDEX "rag_documents_organization_status_idx" ON "rag_documents" ("organization_id","status");--> statement-breakpoint
CREATE INDEX "subscription_reference_id_idx" ON "subscriptions" ("reference_id");--> statement-breakpoint
CREATE INDEX "subscription_stripe_customer_id_idx" ON "subscriptions" ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "subscription_stripe_subscription_id_idx" ON "subscriptions" ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_status_idx" ON "subscriptions" ("status");--> statement-breakpoint
ALTER TABLE "ai_chats" ADD CONSTRAINT "ai_chats_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_chat_id_ai_chats_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "ai_chats"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ai_chat_streams" ADD CONSTRAINT "ai_chat_streams_chat_id_ai_chats_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "ai_chats"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_inviter_id_users_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "two_factors" ADD CONSTRAINT "two_factors_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "uploaded_media" ADD CONSTRAINT "uploaded_media_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "rag_document_chunks" ADD CONSTRAINT "rag_document_chunks_document_id_rag_documents_id_fkey" FOREIGN KEY ("document_id") REFERENCES "rag_documents"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "rag_document_chunks" ADD CONSTRAINT "rag_document_chunks_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "rag_documents" ADD CONSTRAINT "rag_documents_organization_id_organizations_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;