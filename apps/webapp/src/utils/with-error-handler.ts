import { NextResponse } from "next/server";

import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

import { logger } from "@webld/logger/server";

/**
 * Wraps API route handlers to catch TRPCErrors and other errors.
 */
export const withErrorHandler =
	<T extends Request>(handler: (req: T) => Promise<Response>): ((req: T) => Promise<Response>) =>
	async (req: T) => {
		try {
			return await handler(req);
		} catch (error) {
			if (error instanceof TRPCError) {
				const httpStatusCode = getHTTPStatusCodeFromError(error);
				const errorMessage = error.message;

				if (httpStatusCode >= 500) {
					logger.error({
						error,
						message: errorMessage,
						metadata: {
							path: req.url,
							method: req.method,
						},
					});
				}

				return NextResponse.json(
					{
						error: {
							message: errorMessage,
						},
					},
					{ status: httpStatusCode }
				);
			}

			const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";

			logger.error({
				error,
				message: errorMessage,
				metadata: {
					path: req.url,
					method: req.method,
				},
			});

			return NextResponse.json(
				{
					error: {
						message: errorMessage,
					},
				},
				{ status: 500 }
			);
		}
	};
