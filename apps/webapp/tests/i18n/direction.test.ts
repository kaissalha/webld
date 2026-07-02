/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { locale as localeUtils } from "@webld/utils";

describe("getDirection", () => {
	it("returns rtl for Arabic", () => {
		expect(localeUtils.getDirection("ar")).toBe("rtl");
	});

	it("returns ltr for English", () => {
		expect(localeUtils.getDirection("en")).toBe("ltr");
	});

	it("defaults to ltr for unknown locales", () => {
		expect(localeUtils.getDirection("fr")).toBe("ltr");
	});
});
