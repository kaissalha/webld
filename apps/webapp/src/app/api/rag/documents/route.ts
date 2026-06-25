import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { createHash } from "node:crypto";
import { start } from "workflow/api";
import { z } from "zod";

import { uploadBase64ToBlob } from "@/lib/server/storage";
import { withErrorHandler } from "@/utils/with-error-handler";
import { ingestFileWorkflow } from "@/workflows/ingest-file";
import { logger } from "@webld/logger/server";
import { createFile, detectFileKind, isSupportedRagFile } from "@webld/server";
import { auth } from "@webld/server/auth";

const textDocumentSchema = z.object({
	name: z.string().trim().min(1),
	source: z.string().trim().min(1).optional(),
	text: z.string().trim().min(1),
});

const getFileExtension = ({ file }: { file: File }) => file.name.split(".").pop()?.toLowerCase() ?? "";

const getFormString = ({ formData, key }: { formData: FormData; key: string }) => {
	const value = formData.get(key);

	return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

export const POST = withErrorHandler(async (req: Request) => {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
	}

	const organizationId = session.session.activeOrganizationId;

	if (!organizationId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 400 });
	}

	const uploadedBy = session.user.id;
	const contentType = req.headers.get("content-type") ?? "";

	// Knowledge document uploaded as a file: store the blob, then index durably.
	if (contentType.includes("multipart/form-data")) {
		const formData = await req.formData();
		const file = formData.get("file");

		if (!(file instanceof File)) {
			return NextResponse.json({ error: "File is required" }, { status: 400 });
		}

		const extension = getFileExtension({ file });
		const mimeType = file.type || "application/octet-stream";
		const kind = detectFileKind({ mimeType });

		// Images are ingested for vision metadata/OCR (not chunked); everything else must be text-extractable.
		if (kind !== "image" && !isSupportedRagFile({ extension, mimeType })) {
			return NextResponse.json(
				{ error: `Unsupported file type: ${mimeType || extension || "unknown"}` },
				{ status: 400 }
			);
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const name = getFormString({ formData, key: "name" }) ?? file.name;
		const blob = await uploadBase64ToBlob(buffer.toString("base64"), mimeType, {
			access: "public",
			prefix: `${organizationId}/`,
		});

		const fileRecord = await createFile({
			access: "public",
			contentHash: createHash("sha256").update(buffer).digest("hex"),
			contentType: mimeType,
			kind,
			metadata: { originalFilename: file.name },
			name,
			organizationId,
			ragStatus: "pending",
			sizeBytes: file.size,
			sourceType: "upload",
			uploadedBy,
			url: blob.url,
		});

		const run = await start(ingestFileWorkflow, [{ fileId: fileRecord.id, organizationId }]);

		logger.info({
			message: "file received for ingestion",
			metadata: { fileId: fileRecord.id, mimeType, runId: run.runId, size: file.size },
		});

		return NextResponse.json({ file: fileRecord, runId: run.runId });
	}

	// Text-only knowledge item: no blob, pass the text straight to the workflow.
	const parseResult = textDocumentSchema.safeParse(await req.json());

	if (!parseResult.success) {
		return NextResponse.json({ error: "Invalid request data", details: parseResult.error.issues }, { status: 400 });
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

	const run = await start(ingestFileWorkflow, [{ fileId: fileRecord.id, organizationId, text }]);

	return NextResponse.json({ file: fileRecord, runId: run.runId });
});
