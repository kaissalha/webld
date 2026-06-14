import { describe, expect, it } from "vitest";

import { getI18n } from "../src/locales";

describe("getI18n", () => {
	it("falls back to English when locale is unsupported", () => {
		const { locale, t } = getI18n({ locale: "fr" });

		expect(locale).toBe("en");
		expect(t("invoice.title")).toBe("INVOICE");
	});

	it("falls back to English for unsupported locales", () => {
		const { locale, isRtl } = getI18n({ locale: "fr" });

		expect(locale).toBe("en");
		expect(isRtl).toBe(false);
	});

	it("interpolates variables", () => {
		const { t } = getI18n({ locale: "en" });

		expect(t("components.footer.copyright", { year: 2024, companyName: "ACME" })).toContain("ACME");
		expect(t("components.footer.copyright", { year: 2024, companyName: "ACME" })).toContain("2024");
	});
});
