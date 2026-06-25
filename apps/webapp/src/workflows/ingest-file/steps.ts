import { downloadBlob } from "@/lib/server/storage";
import {
	applyFileEnrichment,
	chunkText,
	classifyDocumentContent,
	classifyImageContent,
	clearFileChunks,
	extractFileText,
	type FileClassification,
	generateRagEmbeddings,
	getFile,
	insertFileChunks,
	markFileFailed,
	markFileReady,
	upsertFileTags,
} from "@webld/server";

export type IngestFile = {
	access: "public" | "private";
	contentType: string;
	kind: "audio" | "document" | "image" | "other" | "text" | "video";
	name: string;
	url: string | null;
};

export type IngestChunk = {
	chunkIndex: number;
	content: string;
	metadata: Record<string, unknown>;
};

const extensionFromName = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

export const loadIngestFile = async (fileId: string, organizationId: string): Promise<IngestFile | null> => {
	"use step";

	const file = await getFile({ fileId, organizationId });

	if (!file) {
		return null;
	}

	return {
		access: file.access,
		contentType: file.contentType,
		kind: file.kind,
		name: file.name,
		url: file.url,
	};
};

export const extractDocumentText = async (file: IngestFile): Promise<string> => {
	"use step";

	if (!file.url) {
		return "";
	}

	const { body } = await downloadBlob({ url: file.url, access: file.access });
	const text = await extractFileText({
		buffer: body,
		extension: extensionFromName(file.name),
		mimeType: file.contentType,
	});

	return text.trim();
};

export const classifyDocument = async (text: string): Promise<FileClassification> => {
	"use step";

	return classifyDocumentContent({ text });
};

export const classifyImage = async (file: IngestFile): Promise<FileClassification> => {
	"use step";

	if (!file.url) {
		return { date: null, language: null, ocrText: null, summary: null, tags: [], title: file.name };
	}

	const { body } = await downloadBlob({ url: file.url, access: file.access });

	return classifyImageContent({ image: new Uint8Array(body), mediaType: file.contentType });
};

export const chunkContent = async ({ source, text }: { source: string; text: string }): Promise<IngestChunk[]> => {
	"use step";

	return chunkText({ text }).map((chunk) => ({
		chunkIndex: chunk.metadata.chunkIndex,
		content: chunk.text,
		metadata: { ...chunk.metadata, source },
	}));
};

export const clearChunks = async ({ fileId, organizationId }: { fileId: string; organizationId: string }) => {
	"use step";

	await clearFileChunks({ fileId, organizationId });
};

export const embedAndInsertChunks = async ({
	chunks,
	fileId,
	organizationId,
}: {
	chunks: IngestChunk[];
	fileId: string;
	organizationId: string;
}): Promise<number> => {
	"use step";

	if (chunks.length === 0) {
		return 0;
	}

	const embeddings = await generateRagEmbeddings({ values: chunks.map((chunk) => chunk.content) });

	await insertFileChunks({
		chunks: chunks.map((chunk, index) => ({
			chunkIndex: chunk.chunkIndex,
			content: chunk.content,
			embedding: embeddings[index] ?? [],
			metadata: chunk.metadata,
		})),
		fileId,
		organizationId,
	});

	return chunks.length;
};

export const applyEnrichment = async ({
	classification,
	fileId,
	organizationId,
}: {
	classification: FileClassification;
	fileId: string;
	organizationId: string;
}) => {
	"use step";

	await applyFileEnrichment({
		docDate: classification.date,
		fileId,
		language: classification.language,
		metadataPatch: classification.ocrText ? { ocrText: classification.ocrText } : undefined,
		organizationId,
		summary: classification.summary,
		title: classification.title,
	});

	if (classification.tags.length > 0) {
		await upsertFileTags({ fileId, organizationId, tags: classification.tags });
	}
};

export const markReady = async ({ fileId, organizationId }: { fileId: string; organizationId: string }) => {
	"use step";

	await markFileReady({ fileId, organizationId });
};

export const markFailed = async ({
	error,
	fileId,
	organizationId,
}: {
	error: string;
	fileId: string;
	organizationId: string;
}) => {
	"use step";

	await markFileFailed({ error, fileId, organizationId });
};
