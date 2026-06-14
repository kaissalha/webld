import { Ratelimit } from "@upstash/ratelimit";
import type { Redis } from "@upstash/redis";

export type RateLimitOptions = {
	maxRequests: number; // Maximum number of requests
	withinSeconds: number; // Time window in seconds
	prefix?: string;
	algorithm?: "fixedWindow" | "slidingWindow" | "tokenBucket"; // Type of rate limit algorithm https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms
};

export type RateLimitResult = {
	success: boolean;
	remaining: number;
	willResetOn: number; // UNIX Timestamp when the rate limit resets
	maxRequests: number;
};

/**
 * Creates a rate limiter using Redis
 */
export const createRateLimiter = (redis: Redis, options: RateLimitOptions) => {
	const { maxRequests, withinSeconds, prefix = "ratelimit:", algorithm = "tokenBucket" } = options;

	const limiter = new Ratelimit({
		redis,
		limiter:
			algorithm === "slidingWindow"
				? Ratelimit.slidingWindow(maxRequests, `${withinSeconds} s`)
				: algorithm === "fixedWindow"
					? Ratelimit.fixedWindow(maxRequests, `${withinSeconds} s`)
					: Ratelimit.tokenBucket(maxRequests, `${withinSeconds} s`, maxRequests),
		analytics: true,
		prefix,
	});

	/**
	 * Check if a request is allowed
	 * @param identifier Unique identifier for the request (e.g., IP address)
	 */
	const limit = async (identifier: string): Promise<RateLimitResult> => {
		const result = await limiter.limit(identifier);

		return {
			success: result.success,
			remaining: result.remaining,
			willResetOn: result.reset,
			maxRequests,
		};
	};

	const reset = async (identifier: string): Promise<void> => {
		await limiter.resetUsedTokens(identifier);
	};

	return {
		limit,
		reset,
	};
};
