DROP TABLE "ai_chat_streams";--> statement-breakpoint
ALTER TABLE "ai_chats" ADD COLUMN "last_stream_id" uuid;