import { createRoute, z } from "@hono/zod-openapi";

import { getLinkPreview } from "../../services/link-preview";
import type { CreateApiAppOptions } from "../context";
import { createRequireAuth } from "../middleware/auth";
import { betterAuthSecurity } from "../openapi";
import { createApiRouter } from "../router";
import { errorResponse, linkPreviewResponseSchema } from "../schemas";

const getLinkPreviewRoute = createRoute({
	method: "get",
	path: "/link-previews",
	operationId: "getLinkPreview",
	summary: "Get link preview metadata",
	description: "Fetches title, description, site name, and favicon metadata for a URL.",
	tags: ["link-previews"],
	security: betterAuthSecurity,
	request: {
		query: z
			.object({
				url: z.url().openapi({
					param: {
						name: "url",
						in: "query",
					},
					example: "https://www.webld.dev",
				}),
			})
			.openapi("GetLinkPreviewQuery"),
	},
	responses: {
		200: {
			description: "Link preview metadata. Returns null when metadata cannot be fetched.",
			content: {
				"application/json": {
					schema: linkPreviewResponseSchema,
				},
			},
		},
		400: errorResponse("Invalid request query."),
		401: errorResponse("Authentication is required."),
		500: errorResponse("Unexpected server error."),
	},
});

export const createLinkPreviewsRoutes = (options: CreateApiAppOptions) => {
	const router = createApiRouter();

	router.use("/link-previews", createRequireAuth(options));

	return router.openapi(getLinkPreviewRoute, async (c) => {
		const { url } = c.req.valid("query");
		const metadata = await getLinkPreview({ url });

		return c.json(metadata, 200);
	});
};
