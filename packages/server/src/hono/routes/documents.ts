import { createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { createHash } from "node:crypto";

import type { FileRecord } from "@webld/db";

import { MAX_INGEST_FILE_SIZE_BYTES, MAX_INGEST_FILE_SIZE_MB } from "../../constants/upload";
import { uploadBufferToBlob } from "../../lib/blob-storage";
import { isSupportedRagFile } from "../../services/document-extraction";
import { createFile, detectFileKind, getFile } from "../../services/storage";
import type { CreateApiAppOptions } from "../context";
import { logServerEvent } from "../logger";
import { createRequireAuth, requireActiveOrganization } from "../middleware/auth";
import { betterAuthSecurity } from "../openapi";
import { createApiRouter } from "../router";
import { documentSchema, errorResponse } from "../schemas";

const textDocumentSchema = z
	.object({
		name: z.string().trim().min(1),
		source: z.string().trim().min(1).optional(),
		text: z.string().trim().min(1),
	})
	.openapi("CreateDocumentInput");

const documentParamsSchema = z.object({
	documentId: z.uuid().openapi({
		param: {
			name: "documentId",
			in: "path",
		},
		example: "018ff7c2-1f7c-7b28-b6c1-3f2e60b5d32d",
	}),
});

const createDocumentResponseSchema = z
	.object({
		document: documentSchema,
		runId: z.string(),
	})
	.openapi("CreateDocumentResponse");

const toDocumentResponse = (file: FileRecord) => ({
	id: file.id,
	organizationId: file.organizationId,
	name: file.name,
	url: file.url,
	contentType: file.contentType,
	sizeBytes: file.sizeBytes,
	access: file.access,
	kind: file.kind,
	sourceType: file.sourceType,
	ragStatus: file.ragStatus,
	processingError: file.processingError,
	title: file.title,
	summary: file.summary,
	createdAt: file.createdAt,
	updatedAt: file.updatedAt,
});

const createDocumentRoute = createRoute({
	method: "post",
	path: "/documents",
	operationId: "createDocument",
	summary: "Create a knowledge-base document",
	description:
		"Accepts either a JSON text document or a multipart file upload and queues it for knowledge-base ingestion.",
	tags: ["documents"],
	security: betterAuthSecurity,
	request: {
		body: {
			required: true,
			content: {
				// Plain OpenAPI schema objects (not zod) so the dual content types are
				// documented without attaching a validator for the wrong content type;
				// the handler validates per content type.
				"application/json": {
					schema: {
						type: "object",
						required: ["name", "text"],
						properties: {
							name: { type: "string", minLength: 1 },
							source: { type: "string", minLength: 1 },
							text: { type: "string", minLength: 1 },
						},
					},
				},
				"multipart/form-data": {
					schema: {
						type: "object",
						required: ["file"],
						properties: {
							file: { type: "string", format: "binary" },
							name: { type: "string" },
						},
					},
				},
			},
		},
	},
	responses: {
		202: {
			description: "The document was accepted for ingestion.",
			content: {
				"application/json": {
					schema: createDocumentResponseSchema,
				},
			},
		},
		400: errorResponse("Invalid document payload."),
		401: errorResponse("Authentication is required."),
	},
});

const getDocumentRoute = createRoute({
	method: "get",
	path: "/documents/{documentId}",
	operationId: "getDocument",
	summary: "Get a knowledge-base document",
	tags: ["documents"],
	security: betterAuthSecurity,
	request: {
		params: documentParamsSchema,
	},
	responses: {
		200: {
			description: "The document.",
			content: {
				"application/json": {
					schema: documentSchema,
				},
			},
		},
		401: errorResponse("Authentication is required."),
		404: errorResponse("The document was not found."),
	},
});

export const createDocumentsRoutes = (options: CreateApiAppOptions) => {
	const router = createApiRouter();
	const requireAuth = createRequireAuth(options);

	router.use("/documents", requireAuth);
	router.use("/documents/*", requireAuth);

	return router
		.openapi(createDocumentRoute, async (c) => {
			const session = c.get("session");
			const organizationId = requireActiveOrganization(session);
			const uploadedBy = session.user.id;
			const contentType = c.req.header("content-type") ?? "";

			if (contentType.includes("multipart/form-data")) {
				const formData = await c.req.formData();
				const file = formData.get("file");

				if (!(file instanceof File)) {
					throw new HTTPException(400, { message: "File is required" });
				}

				if (file.size > MAX_INGEST_FILE_SIZE_BYTES) {
					throw new HTTPException(400, {
						message: `File is too large. Maximum size is ${MAX_INGEST_FILE_SIZE_MB}MB.`,
					});
				}

				const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
				const mimeType = file.type || "application/octet-stream";
				const kind = detectFileKind({ extension, mimeType });

				if (kind !== "image" && !isSupportedRagFile({ extension, mimeType })) {
					throw new HTTPException(400, {
						message: `Unsupported file type: ${mimeType || extension || "unknown"}`,
					});
				}

				const buffer = Buffer.from(await file.arrayBuffer());
				const submittedName = formData.get("name");
				const blob = await uploadBufferToBlob(buffer, mimeType, {
					access: "public",
					prefix: `${organizationId}/`,
				});

				const fileRecord = await createFile({
					access: "public",
					contentHash: createHash("sha256").update(buffer).digest("hex"),
					contentType: mimeType,
					kind,
					metadata: { originalFilename: file.name },
					name: typeof submittedName === "string" && submittedName.trim() ? submittedName.trim() : file.name,
					organizationId,
					ragStatus: "pending",
					sizeBytes: file.size,
					sourceType: "upload",
					uploadedBy,
					url: blob.url,
				});

				const run = await options.startIngestFile({ fileId: fileRecord.id, organizationId });

				await logServerEvent({
					level: "info",
					message: "file received for ingestion",
					metadata: { fileId: fileRecord.id, mimeType, runId: run.runId, size: file.size },
				});

				return c.json({ document: toDocumentResponse(fileRecord), runId: run.runId }, 202);
			}

			const parseResult = textDocumentSchema.safeParse(await c.req.json());

			if (!parseResult.success) {
				throw new HTTPException(400, { message: "Invalid request data" });
			}

			const { name, source, text } = parseResult.data;

			const fileRecord = await createFile({
				contentHash: createHash("sha256").update(text).digest("hex"),
				contentType: "text/plain",
				kind: "text",
				metadata: source ? { sourceUrl: source } : {},
				name,
				organizationId,
				ragStatus: "pending",
				sourceType: "text",
				uploadedBy,
				url: null,
			});

			const run = await options.startIngestFile({ fileId: fileRecord.id, organizationId, text });

			return c.json({ document: toDocumentResponse(fileRecord), runId: run.runId }, 202);
		})
		.openapi(getDocumentRoute, async (c) => {
			const session = c.get("session");
			const organizationId = requireActiveOrganization(session);
			const { documentId } = c.req.valid("param");
			const file = await getFile({ fileId: documentId, organizationId });

			if (!file) {
				throw new HTTPException(404, { message: "Document not found" });
			}

			return c.json(toDocumentResponse(file), 200);
		});
};
