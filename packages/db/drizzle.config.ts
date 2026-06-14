import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is not defined in environment variables");
}

export default defineConfig({
	dbCredentials: {
		url: process.env.DATABASE_URL,
	},
	schema: "./src/schema/**/*.ts",
	out: "./src/db/migrations",
	dialect: "postgresql",
	migrations: {
		table: "drizzle_migrations",
		schema: "public",
	},
});
