import { type NextRequest, NextResponse } from "next/server";

import { withErrorHandler } from "@/utils/with-error-handler";
import { handleGmailCallback } from "@starter/app-store";
import { getBaseURL } from "@starter/utils";

export const GET = withErrorHandler(async (request: NextRequest) => {
	const { searchParams } = request.nextUrl;

	const result = await handleGmailCallback({
		code: searchParams.get("code"),
		state: searchParams.get("state"),
		error: searchParams.get("error"),
	});

	const baseUrl = getBaseURL();
	const redirectUrl = new URL("dashboard", baseUrl);

	if (!result.success) {
		redirectUrl.searchParams.set("error", result.error);
	}

	return NextResponse.redirect(redirectUrl);
});
