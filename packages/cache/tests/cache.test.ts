import type { Redis } from "@upstash/redis";
import { describe, expect, it, vi } from "vitest";

import { createCache } from "../src/cache";

describe("createCache", () => {
	it("uses prefix and ttl defaults", async () => {
		const redis = {
			get: vi.fn().mockResolvedValue("value"),
			set: vi.fn().mockResolvedValue(undefined),
			del: vi.fn().mockResolvedValue(undefined),
		};

		const cache = createCache(redis as unknown as Redis);

		await cache.get("key");
		await cache.set("key", "value");
		await cache.del("key");

		expect(redis.get).toHaveBeenCalledWith("cache:key");
		expect(redis.set).toHaveBeenCalledWith("cache:key", "value", { ex: 3600 });
		expect(redis.del).toHaveBeenCalledWith("cache:key");
	});

	it("allows custom prefix and ttl", async () => {
		const redis = {
			get: vi.fn().mockResolvedValue(null),
			set: vi.fn().mockResolvedValue(undefined),
			del: vi.fn().mockResolvedValue(undefined),
		};

		const cache = createCache(redis as unknown as Redis, { prefix: "custom:", ttl: 10 });
		await cache.set("key", "value", 5);

		expect(redis.set).toHaveBeenCalledWith("custom:key", "value", { ex: 5 });
	});

	it("returns null for non-existent keys", async () => {
		const redis = {
			get: vi.fn().mockResolvedValue(null),
			set: vi.fn().mockResolvedValue(undefined),
			del: vi.fn().mockResolvedValue(undefined),
		};

		const cache = createCache(redis as unknown as Redis);
		const result = await cache.get("nonexistent");

		expect(result).toBeNull();
	});

	it("handles object values", async () => {
		const redis = {
			get: vi.fn().mockResolvedValue({ name: "test", count: 42 }),
			set: vi.fn().mockResolvedValue(undefined),
			del: vi.fn().mockResolvedValue(undefined),
		};

		const cache = createCache(redis as unknown as Redis);
		const result = await cache.get<{ name: string; count: number }>("object-key");

		expect(result).toEqual({ name: "test", count: 42 });
	});

	it("handles array values", async () => {
		const redis = {
			get: vi.fn().mockResolvedValue([1, 2, 3]),
			set: vi.fn().mockResolvedValue(undefined),
			del: vi.fn().mockResolvedValue(undefined),
		};

		const cache = createCache(redis as unknown as Redis);
		const result = await cache.get<number[]>("array-key");

		expect(result).toEqual([1, 2, 3]);
	});

	it("uses default ttl when custom not provided", async () => {
		const redis = {
			get: vi.fn().mockResolvedValue(null),
			set: vi.fn().mockResolvedValue(undefined),
			del: vi.fn().mockResolvedValue(undefined),
		};

		const cache = createCache(redis as unknown as Redis, { ttl: 300 });
		await cache.set("key", "value");

		expect(redis.set).toHaveBeenCalledWith("cache:key", "value", { ex: 300 });
	});

	it("allows ttl of 0", async () => {
		const redis = {
			get: vi.fn().mockResolvedValue(null),
			set: vi.fn().mockResolvedValue(undefined),
			del: vi.fn().mockResolvedValue(undefined),
		};

		const cache = createCache(redis as unknown as Redis, { ttl: 0 });
		await cache.set("key", "value");

		expect(redis.set).toHaveBeenCalledWith("cache:key", "value", { ex: 0 });
	});

	it("allows empty prefix", async () => {
		const redis = {
			get: vi.fn().mockResolvedValue("value"),
			set: vi.fn().mockResolvedValue(undefined),
			del: vi.fn().mockResolvedValue(undefined),
		};

		const cache = createCache(redis as unknown as Redis, { prefix: "" });
		await cache.get("key");

		expect(redis.get).toHaveBeenCalledWith("key");
	});

	it("handles keys with special characters", async () => {
		const redis = {
			get: vi.fn().mockResolvedValue("value"),
			set: vi.fn().mockResolvedValue(undefined),
			del: vi.fn().mockResolvedValue(undefined),
		};

		const cache = createCache(redis as unknown as Redis);
		await cache.get("user:123:profile");
		await cache.set("data/path/key", "value");

		expect(redis.get).toHaveBeenCalledWith("cache:user:123:profile");
		expect(redis.set).toHaveBeenCalledWith("cache:data/path/key", "value", { ex: 3600 });
	});

	it("del works with existing and non-existing keys", async () => {
		const redis = {
			get: vi.fn().mockResolvedValue(null),
			set: vi.fn().mockResolvedValue(undefined),
			del: vi.fn().mockResolvedValue(1), // Redis returns count of deleted keys
		};

		const cache = createCache(redis as unknown as Redis);
		await cache.del("some-key");

		expect(redis.del).toHaveBeenCalledWith("cache:some-key");
	});

	it("handles empty string values", async () => {
		const redis = {
			get: vi.fn().mockResolvedValue(""),
			set: vi.fn().mockResolvedValue(undefined),
			del: vi.fn().mockResolvedValue(undefined),
		};

		const cache = createCache(redis as unknown as Redis);
		const result = await cache.get<string>("empty-key");

		expect(result).toBe("");
	});

	it("returns null when redis returns undefined", async () => {
		const redis = {
			get: vi.fn().mockResolvedValue(undefined),
			set: vi.fn().mockResolvedValue(undefined),
			del: vi.fn().mockResolvedValue(undefined),
		};

		const cache = createCache(redis as unknown as Redis);
		const result = await cache.get("missing");

		expect(result).toBeNull();
	});
});
