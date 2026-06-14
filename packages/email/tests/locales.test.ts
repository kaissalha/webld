import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import { getI18n } from "../src/locales";

describe("email i18n", () => {
	it("falls back to English when locale is unsupported", () => {
		const { t } = getI18n({ locale: "fr" });

		expect(t("otp.title")).toBe("Your verification code");
	});

	it("returns the key when missing", () => {
		const { t } = getI18n({ locale: "en" });

		// @ts-expect-error — invalid key; translator should return the key as fallback
		expect(t("missing.key")).toBe("missing.key");
	});

	it("interpolates variables in messages", () => {
		const { t } = getI18n({ locale: "en" });

		expect(t("welcome.greeting", { firstName: "Sam" })).toContain("Sam");
	});

	it("converts line breaks to HTML", () => {
		const { t } = getI18n({ locale: "en" });

		expect(t("otp.signature")).toContain("<br/>");
	});

	it("renders markup translations", () => {
		const { markup } = getI18n({ locale: "en" });
		const node = markup("test.markup", {
			strong: (chunks) => React.createElement("strong", null, chunks),
		});

		const html = renderToStaticMarkup(React.createElement(React.Fragment, null, node));

		expect(html).toContain("<strong>World</strong>");
	});
});
