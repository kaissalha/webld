import { attachDatabasePool } from "@vercel/functions";
import { upstashCache } from "drizzle-orm/cache/upstash";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { relations } from "./relations.ts";

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "test") {
	throw new Error("DATABASE_URL is required.");
}

export const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	max: 10,
	idleTimeoutMillis: 5_000,
	connectionTimeoutMillis: 10_000,
	keepAlive: true,
	keepAliveInitialDelayMillis: 10_000,
});

if (process.env.NODE_ENV !== "test") {
	attachDatabasePool(pool);
}

export const db = drizzle({
	client: pool,
	relations,
	logger: false,
	cache:
		process.env.NODE_ENV === "test"
			? await import("./db-test-redis-cache").then(({ createTestRedisCache }) =>
					createTestRedisCache({
						url: process.env.REDIS_URL!,
						config: { ex: 60 },
					})
				)
			: upstashCache({
					url: process.env.UPSTASH_URL!,
					token: process.env.UPSTASH_TOKEN!,
					config: { ex: 60 },
				}),
});

// Export relations for use elsewhere
export * from "./relations.ts";
export * from "./schema/ai/block.ts";
export * from "./schema/ai/chat.ts";
export * from "./schema/ai/episode.ts";
export * from "./schema/ai/memory.ts";
export * from "./schema/ai/message.ts";
export * from "./schema/auth/accounts.ts";
export * from "./schema/auth/invitations.ts";
export * from "./schema/auth/members.ts";
export * from "./schema/auth/organizations.ts";
export * from "./schema/auth/sessions.ts";
export * from "./schema/auth/users.ts";
export * from "./schema/auth/verifications.ts";
export * from "./schema/integrations/oauth-connections.ts";
export * from "./schema/files/file-chunks.ts";
export * from "./schema/files/files.ts";
export * from "./schema/files/tags.ts";
export * from "./utils/pagination.ts";
export * from "./utils/search.ts";
export * from "./utils/sorting.ts";

export type Transaction = Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];
export type Database = typeof db;
