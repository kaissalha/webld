import { Redis } from "@upstash/redis";
import { Redis as IORedis } from "ioredis";

export type RedisConfig = {
	url: string;
	token: string;
};

export const createRedisClient = (config: RedisConfig): Redis => {
	return new Redis({
		url: config.url,
		token: config.token,
	});
};

export const createTCPRedisClient = (url: string): IORedis => {
	return new IORedis(url);
};
