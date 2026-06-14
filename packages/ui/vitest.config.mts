import react from "@vitejs/plugin-react";
/// <reference types="vitest" />
import path from "node:path";
import { defineProject } from "vitest/config";

export default defineProject({
	plugins: [react()],
	test: {
		environment: "happy-dom",
		globals: true,
		setupFiles: ["./tests/setup.ts"],
		include: ["**/*.test.{ts,tsx}"],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
