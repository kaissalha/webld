/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { getDirection } from "@/utils/get-direction";

describe("getDirection", () => {
	it("returns rtl for Arabic", () => {
		expect(getDirection("ar")).toBe("rtl");
	});

	it("returns ltr for English", () => {
		expect(getDirection("en")).toBe("ltr");
	});

	it("defaults to ltr for unknown locales", () => {
		expect(getDirection("fr")).toBe("ltr");
	});
});
