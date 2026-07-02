import { createRoute, z } from "@hono/zod-openapi";
import type { HandleUploadBody } from "@vercel/blob/client";
import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import { db, members } from "@webld/db";

import { DEFAULT_MAX_UPLOAD_FILE_SIZE_MB, mediaAccessValues } from "../../constants/upload";
import { getBlob, handleClientUpload } from "../../lib/blob-storage";
import { createFile, detectFileKind, findFileByUrl } from "../../services/storage";
import { parseJsonPayload } from "../../utils/parse-json-payload";
import type { CreateApiAppOptions } from "../context";
import { betterAuthSecurity } from "../openapi";
import { createApiRouter } from "../router";
import { errorResponse } from "../schemas";

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

const getMediaQuerySchema = z.object({
	organizationId: z
		.string()
		.min(1)
		.openapi({
			param: {
				name: "organizationId",
				in: "query",
			},
			example: "org_123",
		}),
	url: z.url().openapi({
		param: {
			name: "url",
			in: "query",
		},
		example: "https://example.com/file.png",
	}),
});

type StorageRow = { url: string; access: "public" | "private" };

const requireOrganizationMembership = async ({
	getSession,
	headers,
	organizationId,
	message,
}: {
	getSession: CreateApiAppOptions["getSession"];
	headers: Headers;
	organizationId: string;
	message: string;
}) => {
	const session = await getSession(headers);

	if (!session) {
		throw new HTTPException(401, { message });
	}

	const [member] = await db
		.select({ id: members.id })
		.from(members)
		.where(and(eq(members.organizationId, organizationId), eq(members.userId, session.user.id)))
		.limit(1)
		.execute();

	if (!member) {
		throw new HTTPException(403, { message });
	}

	return { userId: session.user.id, organizationId };
};

const createMediaUploadRoute = createRoute({
	method: "post",
	path: "/media",
	operationId: "createMediaUpload",
	summary: "Create or complete a client media upload",
	description:
		"Implements the Vercel Blob client-upload protocol. Token generation requires a Better Auth session with membership in the target organization; upload-completed callbacks are authenticated by the Vercel Blob signature instead of a session cookie.",
	tags: ["media"],
	security: betterAuthSecurity,
	request: {
		body: {
			required: true,
			description: "Vercel Blob client-upload protocol payload.",
			content: {
				// Plain OpenAPI schema (not zod): the payload shape is owned and
				// validated by the Vercel Blob protocol handler.
				"application/json": {
					schema: {
						type: "object",
						additionalProperties: true,
					},
				},
			},
		},
	},
	responses: {
		200: {
			description: "Vercel Blob upload protocol response.",
			content: {
				"application/json": {
					schema: z.record(z.string(), z.unknown()).openapi("MediaUploadResponse"),
				},
			},
		},
		400: errorResponse("Invalid upload payload."),
		401: errorResponse("Authentication is required."),
		403: errorResponse("The authenticated user cannot access this organization."),
	},
});

const getMediaRoute = createRoute({
	method: "get",
	path: "/media",
	operationId: "getMedia",
	summary: "Fetch uploaded media",
	tags: ["media"],
	security: betterAuthSecurity,
	request: {
		query: getMediaQuerySchema,
	},
	responses: {
		200: {
			description: "The media resource.",
			content: {
				"application/octet-stream": {
					schema: z.string(),
				},
			},
		},
		302: {
			description: "Redirect to the public media URL.",
		},
		304: {
			description: "The media resource was not modified.",
		},
		400: errorResponse("Invalid media request."),
		401: errorResponse("Authentication is required."),
		403: errorResponse("The authenticated user cannot access this organization."),
		404: errorResponse("The media resource was not found."),
	},
});

export const createMediaRoutes = (options: CreateApiAppOptions) =>
	createApiRouter()
		// No router-level auth middleware: token generation authenticates the
		// session inline, and Vercel Blob upload-completed callbacks arrive
		// without cookies and are verified by the protocol signature instead.
		.openapi(createMediaUploadRoute, async (c) => {
			if (process.env.NODE_ENV === "development" && !process.env.VERCEL_BLOB_CALLBACK_URL) {
				throw new Error(
					"VERCEL_BLOB_CALLBACK_URL is required in development (public origin only, no /api/media suffix)"
				);
			}

			const body = await c.req.json<HandleUploadBody>();
			const jsonResponse = await handleClientUpload({
				body,
				request: c.req.raw,
				onBeforeGenerateToken: async (_pathname, clientPayload) => {
					const raw = parseJsonPayload<unknown>(clientPayload, {
						missingMessage: "Missing upload payload.",
						invalidMessage: "Invalid upload payload.",
					});
					const parsed = uploadClientPayloadSchema.safeParse(raw);

					if (!parsed.success) {
						throw new HTTPException(400, {
							message: "Invalid client upload payload.",
						});
					}

					const { userId } = await requireOrganizationMembership({
						getSession: options.getSession,
						headers: c.req.raw.headers,
						organizationId: parsed.data.organizationId,
						message: "Must be authenticated to upload media.",
					});
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
						throw new HTTPException(400, {
							message: "Invalid upload token payload.",
						});
					}

					const extension = blob.pathname.split(".").pop()?.toLowerCase() ?? "";
					const baseContentType = blob.contentType.split(";")[0]?.trim();
					const contentType = baseContentType || "application/octet-stream";
					const kind = detectFileKind({ extension, mimeType: contentType });
					const indexable = kind === "image" || kind === "document" || kind === "text";

					const fileRecord = await createFile({
						access: parsed.data.access,
						contentType,
						kind,
						name: blob.pathname.split("/").pop() ?? blob.pathname,
						organizationId: parsed.data.organizationId,
						ragStatus: indexable ? "pending" : "none",
						sourceType: "upload",
						uploadedBy: parsed.data.userId,
						url: blob.url,
					});

					if (indexable) {
						await options.startIngestFile({
							fileId: fileRecord.id,
							organizationId: parsed.data.organizationId,
						});
					}
				},
			});

			return c.json(jsonResponse, 200);
		})
		.openapi(getMediaRoute, async (c) => {
			const { organizationId, url } = c.req.valid("query");

			await requireOrganizationMembership({
				getSession: options.getSession,
				headers: c.req.raw.headers,
				organizationId,
				message: "Must be authenticated to view uploaded media.",
			});

			const row = await findFileByUrl(organizationId, url, {
				url: true,
				access: true,
			});

			if (!row) {
				throw new HTTPException(404, {
					message: "Uploaded media not found.",
				});
			}

			const stored = row as StorageRow;

			if (stored.access === "public") {
				return Response.redirect(stored.url);
			}

			let pathname: string;

			try {
				pathname = new URL(stored.url).pathname.replace(/^\/+/, "");
			} catch {
				throw new HTTPException(400, {
					message: "Invalid media URL.",
				});
			}

			const blob = await getBlob({
				pathname,
				access: "private",
				ifNoneMatch: c.req.header("if-none-match"),
			});

			if (!blob) {
				throw new HTTPException(404, {
					message: "Blob not found.",
				});
			}

			if (blob.statusCode === 304) {
				return new Response(null, {
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

			return new Response(blob.stream, {
				status: blob.statusCode ?? 200,
				headers: responseHeaders,
			});
		});
