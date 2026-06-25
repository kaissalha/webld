import type { NextConfig } from "next";

import { withPostHogConfig } from "@posthog/nextjs-config";
import withVercelToolbar from "@vercel/toolbar/plugins/next";
import createNextIntlPlugin from "next-intl/plugin";
import { withWorkflow } from "workflow/next";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
	images: {
		unoptimized: true,
	},
	allowedDevOrigins: ["preearthly-dean-unprosperously.ngrok-free.dev"],
	serverExternalPackages: ["dub", "jsonpath", "@vectorstores/readers", "@vectorstores/excel"],
	experimental: {
		typedEnv: true,
		cachedNavigations: true,
	},
	typedRoutes: true,
	reactCompiler: true,
	cacheComponents: true,
	// Next.js 16.3 Instant Navigations: prefetch one reusable shell per route
	// (not per link). Default segment prefetch becomes 'partial'; per-segment
	// `export const prefetch` and `<Link prefetch>` still win. Requires cacheComponents.
	partialPrefetching: true,
	async rewrites() {
		return {
			beforeFiles: [
				{ source: "/robots.txt", destination: "/api/robots" },
				{ source: "/sitemap.xml", destination: "/sitemaps/sitemap.xml" },
				{
					source: "/umbra/script.js",
					destination: "https://www.dubcdn.com/analytics/script.js",
				},
				{
					source: "/umbra/:path",
					destination: "https://api.dub.co/:path",
				},
			],
			afterFiles: [],
			fallback: [],
		};
	},
	headers: async () => [
		{
			source: "/:path*",
			headers: [
				{
					key: "Content-Security-Policy",
					value: "frame-ancestors 'none';",
				},
				{
					key: "Strict-Transport-Security",
					value: "max-age=31536000; includeSubDomains; preload",
				},
				{
					key: "X-Frame-Options",
					value: "DENY",
				},
				{
					key: "X-Content-Type-Options",
					value: "nosniff",
				},
				{
					key: "Referrer-Policy",
					value: "strict-origin-when-cross-origin",
				},
			],
		},
	],
	// This is required to support PostHog trailing slash API requests
	skipTrailingSlashRedirect: true,
};

if (!process.env.POSTHOG_PERSONAL_API_KEY || !process.env.POSTHOG_PROJECT_ID) {
	throw new Error("POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID must be set");
}

export default withWorkflow(
	withPostHogConfig(withVercelToolbar()(withNextIntl(nextConfig)), {
		personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY, // Personal API Key
		envId: process.env.POSTHOG_PROJECT_ID, // Environment ID
		sourcemaps: {
			enabled: process.env.VERCEL_ENV === "production",
			project: "webapp",
			deleteAfterUpload: true,
		},
	})
);
