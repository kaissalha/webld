import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import { type Locale, locales } from "@/i18n/routing";
import { auth } from "@webld/server/auth";

export const publicMiddleware = async (request: NextRequest) => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	const [, locale, ..._segments] = request.nextUrl.pathname.split("/");

	if (session) {
		const signInPath = locales.includes(locale as Locale) ? `/${locale}/dashboard` : "/dashboard";
		const redirectUrl = new URL(signInPath, request.nextUrl.origin);
		const requestedRedirectUrl = request.nextUrl.searchParams.get("redirect_url");
		if (requestedRedirectUrl) {
			redirectUrl.searchParams.set("redirect_url", requestedRedirectUrl);
		}
		return NextResponse.redirect(redirectUrl);
	}

	return;
};
