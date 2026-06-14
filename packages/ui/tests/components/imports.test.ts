import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

describe("component exports", () => {
	it("loads every component module", async () => {
		const componentsDir = path.resolve(__dirname, "../../src/components");
		const componentFiles = fs
			.readdirSync(componentsDir)
			.filter((file) => file.endsWith(".tsx") || file.endsWith(".ts"));

		for (const file of componentFiles) {
			const module = await import(pathToFileURL(path.join(componentsDir, file)).href);
			expect(Object.keys(module).length).toBeGreaterThan(0);
		}
	});
});
