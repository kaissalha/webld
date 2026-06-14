import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { DEFAULT_MAX_UPLOAD_FILE_SIZE_MB, mediaAccessValues } from "@/constants/upload";
import { getBlob, handleClientUpload } from "@/lib/server/storage";
import { createStorageRecord, findStorageByUrl } from "@/services/storage";
import { parseJsonPayload } from "@/utils/parse-json-payload";
import { withErrorHandler } from "@/utils/with-error-handler";
import { db, members } from "@webld/db";
import { auth } from "@webld/server/auth";

const uploadClientPayloadSchema = z.object({
	organizationId: z.string().min(1),
	access: z.enum(mediaAccessValues).default("public"),
	maxFileSizeMb: z
		.number()
		.positive()
		.max(5 * 1024)
		.optional(),
});

const uploadTokenPayloadSchema = z.object({
	userId: z.string(),
	organizationId: z.string().min(1),
	access: z.enum(mediaAccessValues).default("public"),
	maximumSizeInBytes: z.number().positive(),
});

const getBlobQuerySchema = z.object({
	organizationId: z.string().min(1),
	url: z.url(),
});

type StorageRow = { url: string; access: "public" | "private" };

const requireOrganizationMembership = async (organizationId: string, message: string) => {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		throw new TRPCError({ code: "UNAUTHORIZED", message });
	}

	const [member] = await db
		.select({ id: members.id })
		.from(members)
		.where(and(eq(members.organizationId, organizationId), eq(members.userId, session.user.id)))
		.limit(1)
		.execute();

	if (!member) {
		throw new TRPCError({ code: "FORBIDDEN", message });
	}

	return { userId: session.user.id, organizationId };
};

const normalizeStoredContentType = (contentType: string) => {
	const base = contentType.split(";")[0]?.trim();
	return base && base.length > 0 ? base : "application/octet-stream";
};

// Upload to Blob (client upload flow)
export const POST = withErrorHandler(async (req: Request) => {
	if (process.env.NODE_ENV === "development" && !process.env.VERCEL_BLOB_CALLBACK_URL) {
		// https://vercel.com/docs/vercel-blob/client-upload#local-development
		// Must be origin only (e.g. https://xxx.ngrok-free.app); `/api/media` is appended from the request path.
		throw new Error(
			"VERCEL_BLOB_CALLBACK_URL is required in development (public origin only, no /api/media suffix)"
		);
	}

	type UploadBody = Parameters<typeof handleClientUpload>[0]["body"];
	const body = (await req.json()) as UploadBody;
	const jsonResponse = await handleClientUpload({
		body,
		request: req,
		onBeforeGenerateToken: async (_pathname, clientPayload) => {
			const raw = parseJsonPayload<unknown>(clientPayload, {
				missingMessage: "Missing upload payload.",
				invalidMessage: "Invalid upload payload.",
			});
			const parsed = uploadClientPayloadSchema.safeParse(raw);
			if (!parsed.success) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invalid client upload payload.",
				});
			}
			const { userId } = await requireOrganizationMembership(
				parsed.data.organizationId,
				"Must be authenticated to upload media."
			);
			const maxFileSizeMb = parsed.data.maxFileSizeMb ?? DEFAULT_MAX_UPLOAD_FILE_SIZE_MB;
			const maximumSizeInBytes = Math.floor(maxFileSizeMb * 1024 * 1024);

			return {
				maximumSizeInBytes,
				addRandomSuffix: true,
				tokenPayload: JSON.stringify({
					userId,
					organizationId: parsed.data.organizationId,
					access: parsed.data.access,
					maximumSizeInBytes,
				}),
			};
		},
		onUploadCompleted: async ({ blob, tokenPayload }) => {
			const raw = parseJsonPayload<unknown>(tokenPayload, {
				missingMessage: "Missing upload token payload.",
				invalidMessage: "Invalid upload token payload.",
			});
			const parsed = uploadTokenPayloadSchema.safeParse(raw);
			if (!parsed.success) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invalid upload token payload.",
				});
			}
			await createStorageRecord({
				organizationId: parsed.data.organizationId,
				url: blob.url,
				contentType: normalizeStoredContentType(blob.contentType),
				access: parsed.data.access,
			});
		},
	});

	return NextResponse.json(jsonResponse);
});

// Fetch private blob (public URLs redirect as-is)
export const GET = withErrorHandler(async (req: Request) => {
	const url = new URL(req.url);
	const parsed = getBlobQuerySchema.safeParse({
		organizationId: url.searchParams.get("organizationId"),
		url: url.searchParams.get("url"),
	});

	if (!parsed.success) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Invalid request query.",
		});
	}

	await requireOrganizationMembership(parsed.data.organizationId, "Must be authenticated to view uploaded media.");

	const row = await findStorageByUrl(parsed.data.organizationId, parsed.data.url, {
		url: true,
		access: true,
	});

	if (!row) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Uploaded media not found.",
		});
	}

	const stored = row as StorageRow;

	if (stored.access === "public") {
		return NextResponse.redirect(stored.url);
	}

	let pathname: string;
	try {
		pathname = new URL(stored.url).pathname.replace(/^\/+/, "");
	} catch {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Invalid media URL.",
		});
	}
	const ifNoneMatch = req.headers.get("if-none-match") ?? undefined;
	const blob = await getBlob({
		pathname,
		access: "private",
		ifNoneMatch,
	});

	if (!blob) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Blob not found.",
		});
	}

	if (blob.statusCode === 304) {
		return new NextResponse(null, {
			status: 304,
			headers: {
				"Cache-Control": "private, no-cache",
				ETag: blob.blob.etag,
			},
		});
	}

	const responseHeaders = new Headers({
		"Cache-Control": "private, no-cache",
		"Content-Type": blob.blob.contentType,
		ETag: blob.blob.etag,
	});

	if (blob.blob.contentDisposition) {
		responseHeaders.set("Content-Disposition", blob.blob.contentDisposition);
	}

	return new NextResponse(blob.stream, {
		status: blob.statusCode ?? 200,
		headers: responseHeaders,
	});
});
