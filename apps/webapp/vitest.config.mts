/// <reference types="vitest" />

import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineProject } from "vitest/config";

export default defineProject({
	plugins: [react()],
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./tests/setup.ts"],
		include: ["**/*.test.{ts,tsx}"],
		server: {
			deps: {
				// https://github.com/vercel/next.js/issues/77200
				// @exodus/bytes is ESM-only, needs to be inlined for jsdom's html-encoding-sniffer
				inline: ["next-intl", "@exodus/bytes", "html-encoding-sniffer"],
			},
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
