import { headers } from "next/headers";
import { after, NextResponse } from "next/server";

import { createHash } from "node:crypto";
import { z } from "zod";

import { withErrorHandler } from "@/utils/with-error-handler";
import { logger } from "@webld/logger/server";
import {
	createPendingRagDocument,
	extractFileText,
	isSupportedRagFile,
	markRagDocumentFailed,
	upsertRagTextDocument,
} from "@webld/server";
import { auth } from "@webld/server/auth";

const ragDocumentRequestSchema = z.object({
	chunkSize: z.number().min(100).max(10_000).optional(),
	documentId: z.uuid().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
	minChunkSize: z.number().min(10).max(1000).optional(),
	name: z.string().trim().min(1),
	overlap: z.number().min(0).max(2000).optional(),
	source: z.string().trim().min(1).optional(),
	sourceType: z.enum(["text", "file", "url"]).optional(),
	text: z.string().trim().min(1),
});

const ragDocumentFormMetadataSchema = z.record(z.string(), z.unknown()).optional();

const getFileExtension = ({ file }: { file: File }) => file.name.split(".").pop()?.toLowerCase() ?? "";

const getFormString = ({ formData, key }: { formData: FormData; key: string }) => {
	const value = formData.get(key);

	return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const parseFormMetadata = ({ formData }: { formData: FormData }) => {
	const rawMetadata = formData.get("metadata");

	if (typeof rawMetadata !== "string" || !rawMetadata.trim()) {
		return undefined;
	}

	return ragDocumentFormMetadataSchema.parse(JSON.parse(rawMetadata));
};

const indexUploadedDocument = async ({
	buffer,
	documentId,
	extension,
	metadata,
	mimeType,
	name,
	organizationId,
	source,
}: {
	buffer: Buffer;
	documentId: string;
	extension: string;
	metadata: Record<string, unknown>;
	mimeType: string;
	name: string;
	organizationId: string;
	source: string;
}) => {
	try {
		const text = (await extractFileText({ buffer, extension, mimeType })).trim();

		if (!text) {
			await markRagDocumentFailed({
				documentId,
				error: "No text could be extracted from this file",
				organizationId,
			});
			return;
		}

		const result = await upsertRagTextDocument({
			documentId,
			metadata,
			name,
			organizationId,
			source,
			sourceType: "file",
			text,
		});

		logger.info({
			message: "rag document indexed",
			metadata: { documentId, chunkCount: result.chunkCount },
		});
	} catch (error) {
		logger.error({
			error,
			message: "rag document indexing failed",
			metadata: { documentId },
		});
		await markRagDocumentFailed({
			documentId,
			error: error instanceof Error ? error.message : "Failed to index document",
			organizationId,
		}).catch(() => undefined);
	}
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

	const contentType = req.headers.get("content-type") ?? "";

	if (contentType.includes("multipart/form-data")) {
		const formData = await req.formData();
		const file = formData.get("file");

		if (!(file instanceof File)) {
			return NextResponse.json({ error: "File is required" }, { status: 400 });
		}

		const extension = getFileExtension({ file });
		const mimeType = file.type || "";

		if (!isSupportedRagFile({ extension, mimeType })) {
			return NextResponse.json(
				{ error: `Unsupported file type: ${mimeType || extension || "unknown"}` },
				{ status: 400 }
			);
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const metadata = {
			...parseFormMetadata({ formData }),
			extension,
			lastModified: file.lastModified,
			mediaType: mimeType || "application/octet-stream",
			size: file.size,
		};
		const name = getFormString({ formData, key: "name" }) ?? file.name;
		const source = getFormString({ formData, key: "source" }) ?? file.name;
		const document = await createPendingRagDocument({
			contentHash: createHash("sha256").update(buffer).digest("hex"),
			metadata,
			name,
			organizationId,
			source,
			sourceType: "file",
		});

		logger.info({
			message: "rag document received",
			metadata: { documentId: document.id, mimeType, extension, size: file.size },
		});

		after(async () => {
			await indexUploadedDocument({
				buffer,
				documentId: document.id,
				extension,
				metadata,
				mimeType,
				name,
				organizationId,
				source,
			});
		});

		return NextResponse.json({ document });
	}

	const parseResult = ragDocumentRequestSchema.safeParse(await req.json());

	if (!parseResult.success) {
		return NextResponse.json({ error: "Invalid request data", details: parseResult.error.issues }, { status: 400 });
	}

	const result = await upsertRagTextDocument({
		...parseResult.data,
		organizationId,
	});

	return NextResponse.json({
		chunkCount: result.chunkCount,
		document: result.document,
	});
});
