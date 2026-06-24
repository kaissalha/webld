import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ar"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale = "en";

export const routing = defineRouting({
	locales,

	defaultLocale,

	localePrefix: "as-needed",
});

export const generateLocalizedStaticParams = () => locales.map((locale) => ({ locale }));
