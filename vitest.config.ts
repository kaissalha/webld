import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		reporters: ["default", "json"],
		outputFile: "./coverage/results.json",
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/cypress/**",
			"**/.{idea,git,cache,output,temp}/**",
			"**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress}.config.*",
		],
		globalSetup: "./globalSetup.ts",
		projects: ["apps/*", "packages/*"],
	},
});
