import { NextRequest, NextResponse } from "next/server";

import { TRPCError } from "@trpc/server";

import { withErrorHandler } from "@/utils/with-error-handler";
import { logger } from "@webld/logger/server";
import { runOAuthTokenRefreshJob } from "@webld/server";

export const GET = withErrorHandler(async (req: NextRequest) => {
	const authHeader = req.headers.get("authorization");

	if (!process.env.CRON_SECRET) {
		logger.error({
			message: "CRON_SECRET is not configured for refresh-oauth-tokens cron",
			metadata: {
				path: req.nextUrl.pathname,
			},
		});
		throw new TRPCError({ code: "UNAUTHORIZED", message: "CRON_SECRET is not configured" });
	}

	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
	}

	await runOAuthTokenRefreshJob();

	return new NextResponse(null, {
		status: 200,
	});
});
