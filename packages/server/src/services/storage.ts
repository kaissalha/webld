import { and, eq, sql } from "drizzle-orm";

import {
	db,
	type FileAccess,
	type FileKind,
	type FileMetadata,
	type FileRagStatus,
	type FileSourceType,
	files,
} from "@webld/db";

const IMAGE_MIME = /^image\//u;
const VIDEO_MIME = /^video\//u;
const AUDIO_MIME = /^audio\//u;
const DOCUMENT_MIME = new Set([
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.ms-excel",
	"text/csv",
	"text/html",
	"application/xml",
	"text/xml",
]);

/** Map a MIME type to a coarse file kind used to branch ingestion. */
export const detectFileKind = ({ mimeType }: { mimeType: string }): FileKind => {
	if (IMAGE_MIME.test(mimeType)) {
		return "image";
	}
	if (VIDEO_MIME.test(mimeType)) {
		return "video";
	}
	if (AUDIO_MIME.test(mimeType)) {
		return "audio";
	}
	if (DOCUMENT_MIME.has(mimeType)) {
		return "document";
	}
	if (mimeType.startsWith("text/") || mimeType === "application/json") {
		return "text";
	}
	return "other";
};

export const createFile = async (params: {
	access?: FileAccess;
	contentHash?: string | null;
	contentType: string;
	kind?: FileKind;
	metadata?: FileMetadata;
	name: string;
	organizationId: string;
	ragStatus?: FileRagStatus;
	sizeBytes?: number | null;
	sourceType?: FileSourceType;
	uploadedBy?: string | null;
	url?: string | null;
}) => {
	const [file] = await db
		.insert(files)
		.values({
			access: params.access ?? "public",
			contentHash: params.contentHash ?? null,
			contentType: params.contentType,
			kind: params.kind ?? detectFileKind({ mimeType: params.contentType }),
			metadata: params.metadata ?? {},
			name: params.name,
			organizationId: params.organizationId,
			ragStatus: params.ragStatus ?? "none",
			sizeBytes: params.sizeBytes ?? null,
			sourceType: params.sourceType ?? "upload",
			uploadedBy: params.uploadedBy ?? null,
			url: params.url ?? null,
		})
		.returning();

	if (!file) {
		throw new Error("Failed to create file");
	}

	return file;
};

export const getFile = async ({ fileId, organizationId }: { fileId: string; organizationId: string }) => {
	const [file] = await db
		.select()
		.from(files)
		.where(and(eq(files.id, fileId), eq(files.organizationId, organizationId)))
		.limit(1);

	return file ?? null;
};

type FileRowColumns = {
	id?: boolean;
	url?: boolean;
	access?: boolean;
	contentType?: boolean;
};

export const findFileByUrl = async (organizationId: string, url: string, columns: FileRowColumns = { id: true }) =>
	db.query.files.findFirst({
		where: { organizationId, url },
		columns,
	});

export const deleteFileByUrl = async (params: { organizationId: string; url: string }) => {
	await db.delete(files).where(and(eq(files.organizationId, params.organizationId), eq(files.url, params.url)));
};

export const setFileRagStatus = async ({
	error = null,
	fileId,
	organizationId,
	status,
}: {
	error?: string | null;
	fileId: string;
	organizationId: string;
	status: FileRagStatus;
}) => {
	await db
		.update(files)
		.set({ processingError: error, ragStatus: status, updatedAt: new Date().toISOString() })
		.where(and(eq(files.id, fileId), eq(files.organizationId, organizationId)));
};

export const markFileReady = ({ fileId, organizationId }: { fileId: string; organizationId: string }) =>
	setFileRagStatus({ fileId, organizationId, status: "ready" });

export const markFileFailed = ({
	error,
	fileId,
	organizationId,
}: {
	error: string;
	fileId: string;
	organizationId: string;
}) => setFileRagStatus({ error, fileId, organizationId, status: "failed" });

/** Apply AI-generated enrichment, merging a metadata patch into the existing jsonb. */
export const applyFileEnrichment = async ({
	docDate = null,
	fileId,
	language = null,
	metadataPatch,
	organizationId,
	summary = null,
	title = null,
}: {
	docDate?: string | null;
	fileId: string;
	language?: string | null;
	metadataPatch?: Partial<FileMetadata>;
	organizationId: string;
	summary?: string | null;
	title?: string | null;
}) => {
	await db
		.update(files)
		.set({
			docDate,
			language,
			summary,
			title,
			updatedAt: new Date().toISOString(),
			...(metadataPatch && Object.keys(metadataPatch).length > 0
				? { metadata: sql`${files.metadata} || ${JSON.stringify(metadataPatch)}::jsonb` }
				: {}),
		})
		.where(and(eq(files.id, fileId), eq(files.organizationId, organizationId)));
};

const FILE_WAIT_INTERVAL_MS = 1500;
const FILE_WAIT_TIMEOUT_MS = 4.5 * 60 * 1000;

const waitInterval = ({ signal }: { signal?: AbortSignal }) =>
	new Promise<void>((resolve, reject) => {
		if (signal?.aborted) {
			reject(new Error("File wait cancelled"));
			return;
		}

		const handleAbort = () => {
			clearTimeout(timeoutId);
			reject(new Error("File wait cancelled"));
		};
		const timeoutId = setTimeout(() => {
			signal?.removeEventListener("abort", handleAbort);
			resolve();
		}, FILE_WAIT_INTERVAL_MS);

		signal?.addEventListener("abort", handleAbort, { once: true });
	});

/**
 * Poll until the given files finish indexing. `ready` and `none` (not indexable)
 * both count as done; `failed` throws; `pending` keeps waiting.
 */
export const waitForFilesReady = async ({
	fileIds,
	organizationId,
	signal,
	timeoutMs = FILE_WAIT_TIMEOUT_MS,
}: {
	fileIds: string[];
	organizationId: string;
	signal?: AbortSignal;
	timeoutMs?: number;
}) => {
	const uniqueFileIds = Array.from(new Set(fileIds));

	if (uniqueFileIds.length === 0) {
		return [];
	}

	const start = Date.now();

	while (Date.now() - start < timeoutMs) {
		if (signal?.aborted) {
			throw new Error("File wait cancelled");
		}

		const rows = await Promise.all(uniqueFileIds.map((fileId) => getFile({ fileId, organizationId })));
		const missingIndex = rows.findIndex((row) => !row);

		if (missingIndex !== -1) {
			throw new Error(`File not found: ${uniqueFileIds[missingIndex]}`);
		}

		const failed = rows.find((row) => row?.ragStatus === "failed");

		if (failed) {
			throw new Error(failed.processingError ?? `Failed to index ${failed.name}`);
		}

		if (rows.every((row) => row?.ragStatus === "ready" || row?.ragStatus === "none")) {
			return rows;
		}

		await waitInterval({ signal });
	}

	throw new Error("Timed out waiting for attachments to finish indexing");
};
