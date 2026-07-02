import type { Context } from "hono";

import type { ApiEnv } from "./context";

export const apiPathPrefix = "/api";
export const openApiSpecPath = "/openapi.json";

/**
 * Applied to every route that requires a Better Auth session. The scheme names
 * must match the securitySchemes registered in `createApiApp`.
 */
export const betterAuthSecurity: Array<Record<string, string[]>> = [
	{ betterAuthSession: [] },
	{ betterAuthSecureSession: [] },
];

export const createOpenApiDocumentConfig = (c: Context<ApiEnv, typeof openApiSpecPath>) => ({
	openapi: "3.1.0" as const,
	info: {
		title: "webld API",
		version: "1.0.0",
		description:
			"REST API for webld SDK, OpenAPI, and MCP integrations. Authentication endpoints are served by Better Auth under /api/auth and are not part of this document.",
	},
	servers: [
		{
			url: new URL(c.req.url).origin,
			description: "Current deployment",
		},
	],
	tags: [
		{ name: "chats", description: "Chat completion streams and message persistence." },
		{ name: "documents", description: "Knowledge-base documents and ingestion." },
		{ name: "media", description: "Media uploads and retrieval." },
		{ name: "logs", description: "Client log ingestion." },
		{ name: "link-previews", description: "URL metadata previews." },
	],
});
