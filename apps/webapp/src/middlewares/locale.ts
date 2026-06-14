import { type NextRequest, NextResponse } from "next/server";

import createIntlMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export const localeMiddleware = async (request: NextRequest) => {
	if (
		request.nextUrl.pathname.startsWith("/api") ||
		request.nextUrl.pathname === "/robots.txt" ||
		request.nextUrl.pathname.startsWith("/sitemap") ||
		request.nextUrl.pathname.startsWith("/ingest") ||
		request.nextUrl.pathname.startsWith("/.well-known")
	) {
		return NextResponse.next();
	}

	const pathname = request.nextUrl.pathname;

	const url = request.nextUrl;
	if (!routing.locales.some((locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`)) {
		const rewrittenUrl = new URL(
			`/${routing.defaultLocale}${pathname.startsWith("/") ? "" : "/"}${pathname}`,
			request.url
		);
		rewrittenUrl.search = url.search; // This keeps the search params intact

		return NextResponse.rewrite(rewrittenUrl);
	}

	return intlMiddleware(request);
};
