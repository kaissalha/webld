import { after } from "next/server";

import { createResumableStreamContext } from "resumable-stream/ioredis";

import { createTCPRedisClient } from "@webld/cache";

if (!process.env.REDIS_URL) {
	throw new Error("REDIS_URL is not set");
}

export const streamContext = createResumableStreamContext({
	waitUntil: after,
	keyPrefix: "resumable-stream",
	publisher: createTCPRedisClient(process.env.REDIS_URL),
	subscriber: createTCPRedisClient(process.env.REDIS_URL),
});
