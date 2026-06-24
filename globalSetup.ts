import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { RedisContainer, type StartedRedisContainer } from "@testcontainers/redis";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { GenericContainer, Network, type StartedNetwork, type StartedTestContainer } from "testcontainers";

import { type Database, relations } from "@webld/db";

console.log("Setting up global test environment");

let postgresContainer: StartedPostgreSqlContainer;
let redisContainer: StartedRedisContainer;
let srhContainer: StartedTestContainer; // Serverless Redis HTTP proxy
let network: StartedNetwork;
let pool: Pool;
let db: Database;

export const setup = async () => {
	try {
		// Create a Docker network for container communication
		network = await new Network().start();

		// Create PostgreSQL container
		postgresContainer = await new PostgreSqlContainer("pgvector/pgvector:pg18")
			.withDatabase("webldtest")
			.withUsername("test")
			.withPassword("test")
			.start();

		redisContainer = await new RedisContainer("redis:6.2")
			.withNetwork(network)
			.withNetworkAliases("redis")
			.withExposedPorts(6379)
			.start();

		srhContainer = await new GenericContainer("hiett/serverless-redis-http:latest")
			.withExposedPorts(80)
			.withNetwork(network)
			.withEnvironment({
				SRH_MODE: "env",
				SRH_TOKEN: "test-token",
				SRH_CONNECTION_STRING: "redis://redis:6379",
			})
			.start();

		// Set the database URL for the tests
		process.env.DATABASE_URL = postgresContainer.getConnectionUri();

		process.env.REDIS_URL = redisContainer.getConnectionUrl();

		// Set Redis URLs for the tests - pointing to the SRH HTTP proxy
		const srhHost = srhContainer.getHost();
		const srhPort = srhContainer.getMappedPort(80);
		process.env.UPSTASH_URL = `http://${srhHost}:${srhPort}`;
		process.env.UPSTASH_TOKEN = "test-token"; // Must match SRH_TOKEN

		// Create a pool to run migrations
		pool = new Pool({
			connectionString: process.env.DATABASE_URL,
		});

		// Initialize Drizzle
		db = drizzle({ client: pool, relations });

		// Run migrations
		await migrate(db, { migrationsFolder: "./packages/db/src/db/migrations" });
	} catch (error) {
		// Clean up resources if something fails
		if (pool) {
			await pool.end().catch(console.error);
		}
		if (srhContainer) {
			await srhContainer.stop().catch(console.error);
		}
		if (redisContainer) {
			await redisContainer.stop().catch(console.error);
		}
		if (postgresContainer) {
			await postgresContainer.stop().catch(console.error);
		}
		if (network) {
			await network.stop().catch(console.error);
		}
		throw error;
	}
};

export const teardown = async () => {
	try {
		// Close database pool
		if (pool) {
			await pool.end();
		}

		// Stop containers in reverse order
		if (srhContainer) {
			await srhContainer.stop();
		}
		if (redisContainer) {
			await redisContainer.stop();
		}
		if (postgresContainer) {
			await postgresContainer.stop();
		}
		if (network) {
			await network.stop();
		}
	} catch (error) {
		console.error("Error during test teardown:", error);
		throw error;
	}
};
