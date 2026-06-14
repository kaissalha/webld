import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { withErrorHandler } from "@/utils/with-error-handler";
import { createGmailAuthUrl } from "@webld/app-store";
import { auth } from "@webld/server/auth";

export const GET = withErrorHandler(async () => {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session?.session?.activeOrganizationId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const authUrl = createGmailAuthUrl({
		userId: session.user.id,
		organizationId: session.session.activeOrganizationId,
	});

	return NextResponse.redirect(authUrl);
});
