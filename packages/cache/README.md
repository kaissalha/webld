# Key-Value Storage Package

A Redis-based key-value storage package with caching and rate limiting functionality.

Usage example:

```typescript
import { createCache, createRateLimiter, createRedisClient } from "@webld/cache";

export const redis = createRedisClient({
	url: process.env.UPSTASH_URL!,
	token: process.env.UPSTASH_TOKEN!,
});

export const cache = createCache(redis, {
	prefix: "webapp:cache:",
	ttl: 60 * 60, // 1 hour default TTL
});

export const featureRateLimiter = createRateLimiter(redis, {
	prefix: "webapp:rate-limit:chats",
	maxRequests: 5000, // Maximum requests per window
	withinSeconds: 24 * 60 * 60, // 24 hours window
});
```
