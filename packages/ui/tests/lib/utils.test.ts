import { describe, expect, it } from "vitest";

import { cn } from "../../src/lib/utils";

describe("cn", () => {
	it("merges class names and removes duplicates", () => {
		const result = cn("p-2", "p-2", "text-sm", { hidden: false, block: true });

		expect(result).toContain("p-2");
		expect(result).toContain("text-sm");
		expect(result).toContain("block");
		expect(result).not.toContain("hidden");
	});
});
