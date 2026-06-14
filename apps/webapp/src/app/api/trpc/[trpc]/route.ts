import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

import { appRouter, createTRPCContext } from "@/server/trpc";
import { logger } from "@webld/logger/server";

const handler = (req: Request) =>
	fetchRequestHandler({
		allowMethodOverride: true,
		endpoint: "/api/trpc",
		req,
		router: appRouter,
		createContext: createTRPCContext,
		onError: async ({ error, ...rest }) => {
			const httpStatusCode = getHTTPStatusCodeFromError(error);

			if (httpStatusCode >= 500) {
				logger.error({
					error,
					message: error.message,
					metadata: {
						errorType: "Error",
						trpcContext: rest,
					},
				});
			}
		},
	});

export { handler as GET, handler as POST };
