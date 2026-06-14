/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { generateLocalizedStaticParams, locales } from "@/i18n/routing";

describe("generateLocalizedStaticParams", () => {
	it("should include entries for all locales", () => {
		const params = generateLocalizedStaticParams();
		locales.forEach((locale) => {
			expect(params).toContainEqual({ locale });
		});
	});
});
