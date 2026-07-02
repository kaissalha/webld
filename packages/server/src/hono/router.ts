import { OpenAPIHono } from "@hono/zod-openapi";

import type { ApiEnv } from "./context";

/**
 * Every route module builds its sub-router with this factory so validation
 * failures share the same error shape as `HTTPException` responses, and so
 * the chained return types stay intact for the Hono RPC client.
 */
export const createApiRouter = () =>
	new OpenAPIHono<ApiEnv>({
		defaultHook: (result, c) => {
			if (result.success) {
				return;
			}

			return c.json(
				{
					error: {
						message: "Invalid request.",
						issues: result.error.issues.map((issue) => ({
							path: issue.path.join("."),
							message: issue.message,
						})),
					},
				},
				400
			);
		},
	});
