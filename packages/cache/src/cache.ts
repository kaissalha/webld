import type { Redis } from "@upstash/redis";

export type CacheOptions = {
	ttl?: number; // Time-to-live in seconds
	prefix?: string;
};

const DEFAULT_TTL = 60 * 60; // 1 hour in seconds

/**
 * Creates a caching mechanism using Redis
 */
export const createCache = (redis: Redis, options: CacheOptions = {}) => {
	const { ttl = DEFAULT_TTL, prefix = "cache:" } = options;

	/**
	 * Gets a value from the cache
	 */
	const get = async <T>(key: string): Promise<T | null> => {
		const value = await redis.get(`${prefix}${key}`);
		return (value ?? null) as T | null;
	};

	/**
	 * Sets a value in the cache
	 */
	const set = async <T>(key: string, value: T, customTtl?: number): Promise<void> => {
		await redis.set(`${prefix}${key}`, value, {
			ex: customTtl ?? ttl,
		});
	};

	/**
	 * Deletes a value from the cache
	 */
	const del = async (key: string): Promise<void> => {
		await redis.del(`${prefix}${key}`);
	};

	return {
		get,
		set,
		del,
	};
};
