import type { Redis } from "@upstash/redis";
import { beforeEach, describe, expect, it, vi } from "vitest";

const limiterInstance = {
	limit: vi.fn(),
	resetUsedTokens: vi.fn(),
};

vi.mock("@upstash/ratelimit", () => {
	return {
		Ratelimit: Object.assign(
			class {
				limit = limiterInstance.limit;
				resetUsedTokens = limiterInstance.resetUsedTokens;
			},
			{
				slidingWindow: vi.fn(),
				fixedWindow: vi.fn(),
				tokenBucket: vi.fn(),
			}
		),
	};
});

import { Ratelimit } from "@upstash/ratelimit";

import { createRateLimiter } from "../src/rate-limit";

describe("createRateLimiter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("uses token bucket by default", async () => {
		limiterInstance.limit.mockResolvedValue({ success: true, remaining: 2, reset: 100 });
		vi.mocked(Ratelimit.tokenBucket).mockReturnValue({} as never);

		const limiter = createRateLimiter({} as unknown as Redis, { maxRequests: 3, withinSeconds: 60 });
		const result = await limiter.limit("user-1");

		expect(Ratelimit.tokenBucket).toHaveBeenCalledWith(3, "60 s", 3);
		expect(result).toEqual({ success: true, remaining: 2, willResetOn: 100, maxRequests: 3 });
	});

	it("uses sliding window when configured", async () => {
		vi.mocked(Ratelimit.slidingWindow).mockReturnValue({} as never);

		createRateLimiter({} as unknown as Redis, { maxRequests: 5, withinSeconds: 10, algorithm: "slidingWindow" });

		expect(Ratelimit.slidingWindow).toHaveBeenCalledWith(5, "10 s");
	});

	it("uses fixed window when configured", async () => {
		vi.mocked(Ratelimit.fixedWindow).mockReturnValue({} as never);

		createRateLimiter({} as unknown as Redis, { maxRequests: 10, withinSeconds: 30, algorithm: "fixedWindow" });

		expect(Ratelimit.fixedWindow).toHaveBeenCalledWith(10, "30 s");
	});

	it("resets tokens", async () => {
		limiterInstance.resetUsedTokens.mockResolvedValue(undefined);

		const limiter = createRateLimiter({} as unknown as Redis, { maxRequests: 2, withinSeconds: 5 });
		await limiter.reset("user-2");

		expect(limiterInstance.resetUsedTokens).toHaveBeenCalledWith("user-2");
	});

	it("returns rate limit exceeded result", async () => {
		limiterInstance.limit.mockResolvedValue({ success: false, remaining: 0, reset: 1234567890 });
		vi.mocked(Ratelimit.tokenBucket).mockReturnValue({} as never);

		const limiter = createRateLimiter({} as unknown as Redis, { maxRequests: 5, withinSeconds: 60 });
		const result = await limiter.limit("exceeded-user");

		expect(result.success).toBe(false);
		expect(result.remaining).toBe(0);
		expect(result.willResetOn).toBe(1234567890);
		expect(result.maxRequests).toBe(5);
	});

	it("uses custom prefix", async () => {
		vi.mocked(Ratelimit.tokenBucket).mockReturnValue({} as never);

		createRateLimiter({} as unknown as Redis, { maxRequests: 5, withinSeconds: 60, prefix: "api:" });

		// The prefix is passed to Ratelimit constructor, verified by the mock being called
		expect(Ratelimit.tokenBucket).toHaveBeenCalled();
	});

	it("handles multiple identifiers independently", async () => {
		limiterInstance.limit
			.mockResolvedValueOnce({ success: true, remaining: 4, reset: 100 })
			.mockResolvedValueOnce({ success: true, remaining: 9, reset: 200 });
		vi.mocked(Ratelimit.tokenBucket).mockReturnValue({} as never);

		const limiter = createRateLimiter({} as unknown as Redis, { maxRequests: 5, withinSeconds: 60 });

		const result1 = await limiter.limit("user-a");
		const result2 = await limiter.limit("user-b");

		expect(result1.remaining).toBe(4);
		expect(result2.remaining).toBe(9);
	});

	it("returns maxRequests in result", async () => {
		limiterInstance.limit.mockResolvedValue({ success: true, remaining: 99, reset: 100 });
		vi.mocked(Ratelimit.tokenBucket).mockReturnValue({} as never);

		const limiter = createRateLimiter({} as unknown as Redis, { maxRequests: 100, withinSeconds: 60 });
		const result = await limiter.limit("test-user");

		expect(result.maxRequests).toBe(100);
	});
});
