import { defineConfig } from "evalite/config";
import { createSqliteStorage } from "evalite/sqlite-storage";

const scoreThreshold = 75;

// oxlint-disable-next-line import/no-default-export
export default defineConfig({
	storage: () => createSqliteStorage("./.evalite/evalite.db"),
	server: {
		port: 3406,
	},
	scoreThreshold,
	testTimeout: 120_000,
	maxConcurrency: process.env.CI === "true" ? 3 : 6,
	trialCount: 1,
	hideTable: process.env.CI === "true",
	cache: true,
	forceRerunTriggers: ["evals/**/*.ts", "../ai/src/**/*.ts", "../server/src/**/*.ts"],
});
