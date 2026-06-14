import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import { type Locale, locales } from "@/i18n/routing";
import { auth } from "@webld/server/auth";

export const protectedMiddleware = async (request: NextRequest) => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	const [, locale, ..._segments] = request.nextUrl.pathname.split("/");

	if (!session) {
		const signInPath = locales.includes(locale as Locale) ? `/${locale}/login` : "/login";
		const redirectUrl = new URL(signInPath, request.nextUrl.origin);
		const originalUrl = new URL(request.url);
		redirectUrl.searchParams.set("redirect_url", originalUrl.pathname);
		return NextResponse.redirect(redirectUrl);
	}

	return;
};
