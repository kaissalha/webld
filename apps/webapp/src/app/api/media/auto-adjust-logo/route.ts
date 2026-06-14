import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { MediaAccess } from "@/constants/upload";
import { processAndStoreAutoAdjustedOrganizationLogo } from "@/lib/server/auto-adjust-organization-logo";
import { findStorageByUrl } from "@/services/storage";
import { withErrorHandler } from "@/utils/with-error-handler";
import { auth } from "@webld/server/auth";

const bodySchema = z.object({
	organizationId: z.string().min(1),
	sourceImageUrl: z.url(),
});

type StorageLookupRow = { url: string; access: MediaAccess };

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const storageLookupAttempts = 12;
const storageLookupIntervalMs = 100;

const isOrganizationLogoBlobPath = (organizationId: string, imageUrl: string) => {
	try {
		const pathname = decodeURIComponent(new URL(imageUrl).pathname.replace(/^\/+/, ""));
		return pathname.includes(`organizations/${organizationId}/logos/`);
	} catch {
		return false;
	}
};

const lookupUploadedLogoRow = async (organizationId: string, sourceImageUrl: string) => {
	for (let attempt = 0; attempt < storageLookupAttempts; attempt++) {
		const row = await findStorageByUrl(organizationId, sourceImageUrl, {
			url: true,
			access: true,
		});
		if (row) {
			return row as StorageLookupRow;
		}
		if (attempt < storageLookupAttempts - 1) {
			await sleep(storageLookupIntervalMs);
		}
	}

	return null;
};

const requireActiveOrganization = async (organizationId: string, message: string) => {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		throw new TRPCError({ code: "UNAUTHORIZED", message });
	}

	const activeOrganizationId = session.session.activeOrganizationId;

	if (!activeOrganizationId || activeOrganizationId !== organizationId) {
		throw new TRPCError({ code: "FORBIDDEN", message });
	}
};

export const POST = withErrorHandler(async (req: Request) => {
	const parsed = bodySchema.safeParse(await req.json());
	if (!parsed.success) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Invalid request body.",
		});
	}

	await requireActiveOrganization(parsed.data.organizationId, "Must be authenticated to process media.");

	const row = await lookupUploadedLogoRow(parsed.data.organizationId, parsed.data.sourceImageUrl);

	let storedAccess: MediaAccess;
	if (row) {
		storedAccess = row.access;
	} else if (isOrganizationLogoBlobPath(parsed.data.organizationId, parsed.data.sourceImageUrl)) {
		storedAccess = "public";
	} else {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Source image not found for this organization.",
		});
	}

	const result = await processAndStoreAutoAdjustedOrganizationLogo({
		organizationId: parsed.data.organizationId,
		sourceImageUrl: parsed.data.sourceImageUrl,
		storedAccess,
	});

	return NextResponse.json(result);
});
