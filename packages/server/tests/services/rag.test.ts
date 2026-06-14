import { describe, expect, it } from "vitest";

import { chunkRagText } from "../../src/services/rag";

describe("rag service", () => {
	it("does not emit a duplicate overlapped tail chunk after reaching the end", () => {
		const text = `${"A".repeat(2000)}${"B".repeat(500)}`;

		const chunks = chunkRagText({
			chunkSize: 2000,
			minChunkSize: 100,
			overlap: 200,
			separators: [""],
			text,
		});

		expect(chunks).toHaveLength(2);
		expect(chunks.map((chunk) => chunk.text.length)).toEqual([2000, 700]);
		expect(chunks.at(-1)?.metadata.endChar).toBe(text.length);
	});
});
