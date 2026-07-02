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

const uploadDocumentSchema = z
	.object({
		file: z
			.file()
			.max(MAX_INGEST_FILE_SIZE_BYTES, `File is too large. Maximum size is ${MAX_INGEST_FILE_SIZE_MB}MB.`)
			// The OpenAPI generator cannot introspect z.file(); the explicit type
			// short-circuits schema generation so /openapi.json does not throw.
			.openapi({ type: "string", format: "binary" }),
		name: z.string().trim().optional(),
	})
	.openapi("UploadDocumentInput");

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

const acceptedDocumentResponse = {
	description: "The document was accepted for ingestion.",
	content: {
		"application/json": {
			schema: createDocumentResponseSchema,
		},
	},
};

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
	summary: "Create a knowledge-base text document",
	description: "Creates a text document and queues it for knowledge-base ingestion.",
	tags: ["documents"],
	security: betterAuthSecurity,
	request: {
		body: {
			required: true,
			content: {
				"application/json": {
					schema: textDocumentSchema,
				},
			},
		},
	},
	responses: {
		202: acceptedDocumentResponse,
		400: errorResponse("Invalid document payload."),
		401: errorResponse("Authentication is required."),
	},
});

const uploadDocumentRoute = createRoute({
	method: "post",
	path: "/documents/upload",
	operationId: "uploadDocument",
	summary: "Upload a knowledge-base document",
	description: "Accepts a multipart file upload and queues it for knowledge-base ingestion.",
	tags: ["documents"],
	security: betterAuthSecurity,
	request: {
		body: {
			required: true,
			content: {
				"multipart/form-data": {
					schema: uploadDocumentSchema,
				},
			},
		},
	},
	responses: {
		202: acceptedDocumentResponse,
		400: errorResponse("Invalid upload payload."),
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
			const { name, source, text } = c.req.valid("json");

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
		.openapi(uploadDocumentRoute, async (c) => {
			const session = c.get("session");
			const organizationId = requireActiveOrganization(session);
			const uploadedBy = session.user.id;
			const { file, name } = c.req.valid("form");

			const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
			const mimeType = file.type || "application/octet-stream";
			const kind = detectFileKind({ extension, mimeType });

			if (kind !== "image" && !isSupportedRagFile({ extension, mimeType })) {
				throw new HTTPException(400, {
					message: `Unsupported file type: ${mimeType || extension || "unknown"}`,
				});
			}

			const buffer = Buffer.from(await file.arrayBuffer());
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
				name: name || file.name,
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
