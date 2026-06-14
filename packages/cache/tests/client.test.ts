import { describe, expect, it, vi } from "vitest";

// Mock @upstash/redis
vi.mock("@upstash/redis", () => {
	return {
		Redis: class MockRedis {
			url: string;
			token: string;
			constructor(config: { url: string; token: string }) {
				this.url = config.url;
				this.token = config.token;
			}
		},
	};
});

// Mock ioredis
vi.mock("ioredis", () => {
	return {
		Redis: class MockIORedis {
			url: string;
			constructor(url: string) {
				this.url = url;
			}
		},
	};
});

import { createRedisClient, createTCPRedisClient, type RedisConfig } from "../src/client";

describe("createRedisClient", () => {
	it("creates an Upstash Redis client with provided config", () => {
		const config: RedisConfig = {
			url: "https://test-redis.upstash.io",
			token: "test-token-123",
		};

		const client = createRedisClient(config);

		expect(client).toBeDefined();
		expect((client as unknown as { url: string }).url).toBe(config.url);
		expect((client as unknown as { token: string }).token).toBe(config.token);
	});

	it("returns a Redis instance", () => {
		const config: RedisConfig = {
			url: "https://another-redis.upstash.io",
			token: "another-token",
		};

		const client = createRedisClient(config);

		expect(client).toBeDefined();
	});

	it("handles auth URLs without throwing", () => {
		const config: RedisConfig = {
			url: "https://user:pass@redis.upstash.io",
			token: "auth-token",
		};

		const create = () => createRedisClient(config);

		expect(create).not.toThrow();
	});

	it("handles invalid configs without throwing", () => {
		const config: RedisConfig = {
			url: "",
			token: "",
		};

		const create = () => createRedisClient(config);

		expect(create).not.toThrow();
	});
});

describe("createTCPRedisClient", () => {
	it("creates an ioredis TCP client with provided URL", () => {
		const url = "redis://localhost:6379";

		const client = createTCPRedisClient(url);

		expect(client).toBeDefined();
		expect((client as unknown as { url: string }).url).toBe(url);
	});

	it("accepts Redis URL with authentication", () => {
		const url = "redis://user:password@localhost:6379/0";

		const client = createTCPRedisClient(url);

		expect(client).toBeDefined();
	});
});
