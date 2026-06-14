import { describe, expect, it } from "vitest";

import { addFullTextSearch, buildSearchQuery } from "../../src/utils/search";

describe("buildSearchQuery", () => {
	it("normalizes and joins search terms", () => {
		expect(buildSearchQuery("Hello   World")).toBe("hello:* & world:*");
	});

	it("returns empty string for blank input", () => {
		expect(buildSearchQuery("   ")).toBe("");
	});

	it("preserves punctuation in terms", () => {
		expect(buildSearchQuery("Hello, World!")).toBe("hello,:* & world!:*");
	});
});

describe("addFullTextSearch", () => {
	it("appends a full text search condition when term is provided", () => {
		const whereConditions: Parameters<typeof addFullTextSearch>[0]["whereConditions"] = [];
		const model = { fts: "fts" } as unknown as Parameters<typeof addFullTextSearch>[0]["model"];

		addFullTextSearch({ whereConditions, model, searchTerm: "Test" });

		expect(whereConditions).toHaveLength(1);
	});

	it("throws when model lacks fts column", () => {
		const whereConditions: Parameters<typeof addFullTextSearch>[0]["whereConditions"] = [];

		expect(() =>
			addFullTextSearch({
				whereConditions,
				model: {} as Parameters<typeof addFullTextSearch>[0]["model"],
				searchTerm: "Test",
			})
		).toThrow("Model does not have an fts field");
	});
});
