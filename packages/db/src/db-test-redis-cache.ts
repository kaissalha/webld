// Redis cache for Drizzle tests instead of Upstash

import { getTableName, isTable } from "drizzle-orm";
import { Cache, type MutationOption } from "drizzle-orm/cache/core";
import type { CacheConfig } from "drizzle-orm/cache/core/types";
import { Redis } from "ioredis";

const DEFAULT_TTL_SECONDS = 60;
const CACHE_PREFIX = "__drizzle_test_cache__";
const BIGINT_PREFIX = "__drizzle_bigint__:";
const BUFFER_PREFIX = "__drizzle_buffer__:";

type CacheEntryKind = "query" | "tag";

const toArray = <T>(value: T | T[] | undefined) => {
	if (value === undefined) {
		return [] as T[];
	}

	return Array.isArray(value) ? value : [value];
};

const encodeValue = (value: unknown) =>
	JSON.stringify(value, (_key, innerValue) => {
		if (typeof innerValue === "bigint") {
			return `${BIGINT_PREFIX}${innerValue.toString()}`;
		}

		if (Buffer.isBuffer(innerValue)) {
			return `${BUFFER_PREFIX}${innerValue.toString("base64")}`;
		}

		if (typeof innerValue === "function" || typeof innerValue === "symbol") {
			return undefined;
		}

		return innerValue;
	});

const decodeValue = (rawValue: string | null): unknown[] | undefined => {
	if (!rawValue) {
		return undefined;
	}

	try {
		return JSON.parse(rawValue, (_key, innerValue) => {
			if (typeof innerValue !== "string") {
				return innerValue;
			}

			if (innerValue.startsWith(BIGINT_PREFIX)) {
				return BigInt(innerValue.slice(BIGINT_PREFIX.length));
			}

			if (innerValue.startsWith(BUFFER_PREFIX)) {
				return Buffer.from(innerValue.slice(BUFFER_PREFIX.length), "base64");
			}

			return innerValue;
		}) as unknown[];
	} catch {
		return undefined;
	}
};

class TestRedisCache extends Cache {
	constructor(
		private readonly redis: Redis,
		private readonly useGlobally: boolean,
		private readonly defaultTtlSeconds: number
	) {
		super();
	}

	override strategy() {
		return this.useGlobally ? "all" : "explicit";
	}

	private getEntryKey = (key: string, kind: CacheEntryKind) => `${CACHE_PREFIX}:${kind}:${key}`;

	private getTableSetKey = (tableName: string) => `${CACHE_PREFIX}:table:${tableName}`;

	override async get(key: string, _tables: string[], isTag = false): Promise<unknown[] | undefined> {
		const entryKey = this.getEntryKey(key, isTag ? "tag" : "query");
		const cachedValue = await this.redis.get(entryKey);

		return decodeValue(cachedValue);
	}

	override async put(
		key: string,
		response: unknown,
		tables: string[],
		isTag = false,
		config?: CacheConfig
	): Promise<void> {
		const entryKey = this.getEntryKey(key, isTag ? "tag" : "query");
		const payload = encodeValue(response);
		const ttlSeconds = config?.ex ?? this.defaultTtlSeconds;
		const tableNames = Array.from(new Set(tables));
		const pipeline = this.redis.multi();

		if (ttlSeconds > 0) {
			pipeline.set(entryKey, payload, "EX", ttlSeconds);
		} else {
			pipeline.set(entryKey, payload);
		}

		// Keep per-table indexes so mutate operations can invalidate related cached queries.
		for (const tableName of tableNames) {
			const tableSetKey = this.getTableSetKey(tableName);
			pipeline.sadd(tableSetKey, entryKey);
			if (ttlSeconds > 0) {
				pipeline.expire(tableSetKey, ttlSeconds);
			}
		}

		await pipeline.exec();
	}

	override async onMutate(params: MutationOption): Promise<void> {
		const tags = toArray(params.tags);
		const tables = toArray(params.tables);
		const keysToDelete = new Set<string>();

		for (const tag of tags) {
			keysToDelete.add(this.getEntryKey(tag, "tag"));
		}

		for (const table of tables) {
			const tableName = typeof table === "string" ? table : isTable(table) ? getTableName(table) : undefined;
			if (!tableName) {
				continue;
			}

			const tableSetKey = this.getTableSetKey(tableName);
			const cacheKeysForTable = await this.redis.smembers(tableSetKey);
			for (const cacheKey of cacheKeysForTable) {
				keysToDelete.add(cacheKey);
			}

			keysToDelete.add(tableSetKey);
		}

		if (keysToDelete.size === 0) {
			return;
		}

		await this.redis.del(...keysToDelete);
	}
}

export const createTestRedisCache = ({
	url,
	global = false,
	config,
}: {
	url: string;
	global?: boolean;
	config?: CacheConfig;
}) => {
	const redis = new Redis(url, {
		maxRetriesPerRequest: 1,
		retryStrategy: () => null,
	});
	const ttlSeconds = config?.ex ?? DEFAULT_TTL_SECONDS;

	redis.on("error", () => {});
	redis.on("connect", () => {
		const redisConnection = redis as unknown as {
			connector?: {
				stream?: {
					unref?: () => void;
				};
			};
		};
		redisConnection.connector?.stream?.unref?.();
	});

	process.once("exit", () => {
		redis.disconnect();
	});

	return new TestRedisCache(redis, global, ttlSeconds);
};
