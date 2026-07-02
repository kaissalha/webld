import { HTTPException } from "hono/http-exception";

import type { CreateApiAppOptions } from "./context";
import { logServerEvent } from "./logger";
import { apiPathPrefix, createOpenApiDocumentConfig, openApiSpecPath } from "./openapi";
import { createApiRouter } from "./router";
import { createAuthRoutes } from "./routes/auth";
import { createChatsRoutes } from "./routes/chats";
import { createDocumentsRoutes } from "./routes/documents";
import { createLinkPreviewsRoutes } from "./routes/link-previews";
import { createLogsRoutes } from "./routes/logs";
import { createMediaRoutes } from "./routes/media";

const logApiError = async ({
	error,
	message,
	path,
	method,
}: {
	error: unknown;
	message: string;
	path: string;
	method: string;
}) => {
	await logServerEvent({
		level: "error",
		error,
		message,
		metadata: {
			path,
			method,
		},
	});
};

export const createApiApp = (options: CreateApiAppOptions) => {
	const app = createApiRouter().basePath(apiPathPrefix);

	app.openAPIRegistry.registerComponent("securitySchemes", "betterAuthSession", {
		type: "apiKey",
		in: "cookie",
		name: "better-auth.session_token",
		description: "Better Auth session cookie issued by the web application.",
	});

	app.openAPIRegistry.registerComponent("securitySchemes", "betterAuthSecureSession", {
		type: "apiKey",
		in: "cookie",
		name: "__Secure-better-auth.session_token",
		description: "Secure Better Auth session cookie issued by HTTPS deployments.",
	});

	app.onError(async (error, c) => {
		if (error instanceof HTTPException) {
			if (error.status >= 500) {
				await logApiError({
					error,
					message: error.message,
					path: c.req.url,
					method: c.req.method,
				});
			}

			return c.json(
				{
					error: {
						message: error.message,
					},
				},
				error.status
			);
		}

		const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";

		await logApiError({
			error,
			message: errorMessage,
			path: c.req.url,
			method: c.req.method,
		});

		return c.json(
			{
				error: {
					message: "An unexpected error occurred",
				},
			},
			500
		);
	});

	app.notFound((c) =>
		c.json(
			{
				error: {
					message: "Not found.",
				},
			},
			404
		)
	);

	return app
		.route("/", createAuthRoutes(options))
		.route("/", createChatsRoutes(options))
		.route("/", createDocumentsRoutes(options))
		.route("/", createLinkPreviewsRoutes(options))
		.route("/", createLogsRoutes(options))
		.route("/", createMediaRoutes(options))
		.doc31(openApiSpecPath, createOpenApiDocumentConfig, {
			unionPreferredType: "oneOf",
		});
};

export type AppType = ReturnType<typeof createApiApp>;

export { apiPathPrefix, openApiSpecPath } from "./openapi";
