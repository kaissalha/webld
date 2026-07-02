import { createRoute, z } from "@hono/zod-openapi";

import type { CreateApiAppOptions } from "../context";
import { logServerEvent } from "../logger";
import { createRequireAuth } from "../middleware/auth";
import { betterAuthSecurity } from "../openapi";
import { createApiRouter } from "../router";
import { errorResponse } from "../schemas";

const logEventSchema = z
	.object({
		level: z.enum(["debug", "info", "warn", "error"]),
		message: z.string().min(1),
		metadata: z.record(z.string(), z.unknown()).optional(),
		error: z.unknown().optional(),
	})
	.openapi("LogEvent");

const createLogRoute = createRoute({
	method: "post",
	path: "/logs",
	operationId: "createLog",
	summary: "Ingest a client log event",
	tags: ["logs"],
	security: betterAuthSecurity,
	request: {
		body: {
			required: true,
			content: {
				"application/json": {
					schema: logEventSchema,
				},
			},
		},
	},
	responses: {
		202: {
			description: "The log event was accepted.",
		},
		400: errorResponse("Invalid log payload."),
		401: errorResponse("Authentication is required."),
	},
});

export const createLogsRoutes = (options: CreateApiAppOptions) => {
	const router = createApiRouter();

	router.use("/logs", createRequireAuth(options));

	return router.openapi(createLogRoute, async (c) => {
		await logServerEvent(c.req.valid("json"));

		return c.body(null, 202);
	});
};
