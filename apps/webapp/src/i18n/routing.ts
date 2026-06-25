import type { Metadata } from "next";

import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ar"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale = "en";

/**
 * Explicit time zone for formatting so server/client agree (avoids next-intl's
 * `ENVIRONMENT_FALLBACK` warning + hydration mismatches). Static to keep pages
 * prerenderable; for per-visitor zones, set it from `x-vercel-ip-timezone`.
 */
export const DEFAULT_TIME_ZONE = "America/New_York";

export const routing = defineRouting({
	locales,

	defaultLocale,

	localePrefix: "as-needed",
});

export const generateLocalizedStaticParams = () => locales.map((locale) => ({ locale }));

/** Locale-relative path for `pathname` under `as-needed` prefixing (default locale stays unprefixed). */
const localizedPath = (locale: Locale, pathname: string) => {
	const normalized = pathname === "/" ? "" : pathname.startsWith("/") ? pathname : `/${pathname}`;
	return `${locale === defaultLocale ? "" : `/${locale}`}${normalized}` || "/";
};

/**
 * Per-path `hreflang` + canonical alternates for a page's `generateMetadata`,
 * resolved against `metadataBase`. Companion to `generateLocalizedStaticParams`.
 */
export const generateLocalizedMetadata = (pathname = "/"): Metadata => {
	const canonical = localizedPath(defaultLocale, pathname);

	return {
		alternates: {
			canonical,
			languages: {
				...Object.fromEntries(locales.map((locale) => [locale, localizedPath(locale, pathname)])),
				"x-default": canonical,
			},
		},
	};
};
