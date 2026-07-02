import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { postHogMiddleware } from "@posthog/next";

import { localeMiddleware } from "./middlewares/locale";
import { protectedMiddleware } from "./middlewares/protected";
import { publicMiddleware } from "./middlewares/public";

const MARKDOWN_ACCEPT = /\btext\/markdown\b/i;
const MARKDOWN_HANDLER_PATH = "/api/accept-md";
const MARKDOWN_EXCLUDED_PATH_PREFIXES = ["/api/", "/_next/"] as const;

// Route-specific middleware configuration
const routeMiddlewares: Record<string, Array<(req: NextRequest) => Promise<NextResponse | undefined>>> = {
	"/dashboard": [protectedMiddleware],
	"/onboarding": [protectedMiddleware],
	"/login": [publicMiddleware],
	"/signup": [publicMiddleware],
};

const applyPostHogMiddleware = async (request: NextRequest, response?: NextResponse) => {
	return postHogMiddleware({
		proxy: true,
		response,
	})(request);
};

export default async function proxy(req: NextRequest, _event: NextFetchEvent) {
	const { pathname, search } = req.nextUrl;
	const acceptHeader = req.headers.get("accept");

	if (
		acceptHeader &&
		MARKDOWN_ACCEPT.test(acceptHeader) &&
		!MARKDOWN_EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
	) {
		const markdownPath = `${pathname}${search}`;
		const rewriteUrl = new URL(MARKDOWN_HANDLER_PATH, req.url);
		rewriteUrl.searchParams.set("path", markdownPath);

		const headers = new Headers(req.headers);
		headers.set("x-accept-md-path", markdownPath);

		return applyPostHogMiddleware(
			req,
			NextResponse.rewrite(rewriteUrl, {
				request: {
					headers,
				},
			})
		);
	}

	for (const [route, middlewares] of Object.entries(routeMiddlewares)) {
		const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "");
		const normalizedPath = pathWithoutLocale || "/";
		const matchesRoute =
			route === "/dashboard" ? normalizedPath.startsWith("/dashboard") : normalizedPath === route;

		if (matchesRoute) {
			// Execute route-specific middleware

			for (const middlewareFn of middlewares) {
				const middlewareResponse = await middlewareFn(req);

				if (middlewareResponse) return applyPostHogMiddleware(req, middlewareResponse);
			}

			break;
		}
	}

	const localeResponse = await localeMiddleware(req);
	return applyPostHogMiddleware(req, localeResponse);
}

export const config = {
	matcher: [
		// Always proxy PostHog ingest assets and API calls, including .js loader files
		"/ingest/:path*",
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|riv|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api)(.*)",
	],
};
