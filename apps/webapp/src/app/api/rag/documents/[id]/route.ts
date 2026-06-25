import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { z } from "zod";

import { withErrorHandler } from "@/utils/with-error-handler";
import { getFile } from "@webld/server";
import { auth } from "@webld/server/auth";

const paramsSchema = z.object({
	id: z.uuid(),
});

export const GET = withErrorHandler(async (req: Request) => {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
	}

	const organizationId = session.session.activeOrganizationId;

	if (!organizationId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 400 });
	}

	const url = new URL(req.url);
	const id = url.pathname.split("/").pop() ?? "";
	const parsedParams = paramsSchema.safeParse({ id });

	if (!parsedParams.success) {
		return NextResponse.json({ error: "Invalid file id" }, { status: 400 });
	}

	const file = await getFile({ fileId: parsedParams.data.id, organizationId });

	if (!file) {
		return NextResponse.json({ error: "File not found" }, { status: 404 });
	}

	return NextResponse.json({ file });
});
