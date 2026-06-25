import {
	applyEnrichment,
	chunkContent,
	classifyDocument,
	classifyImage,
	clearChunks,
	embedAndInsertChunks,
	extractDocumentText,
	type IngestChunk,
	loadIngestFile,
	markFailed,
	markReady,
} from "./steps";

/** Chunks per embed step. Small files → a single batch runs inline; large files fan out. */
const EMBED_BATCH_SIZE = 20;

const batch = <T>(items: T[], size: number): T[][] => {
	const batches: T[][] = [];

	for (let index = 0; index < items.length; index += size) {
		batches.push(items.slice(index, index + size));
	}

	return batches;
};

/**
 * Durable ingestion: branch by kind → enrich → chunk → embed → persist → mark ready.
 * The blob is already usable when this starts; this only drives indexing/enrichment.
 * Pass `text` for text-only items (no blob to download).
 */
export const ingestFileWorkflow = async ({
	fileId,
	organizationId,
	text,
}: {
	fileId: string;
	organizationId: string;
	text?: string;
}) => {
	"use workflow";

	const file = await loadIngestFile(fileId, organizationId);

	if (!file) {
		return;
	}

	try {
		let chunkSource = "";

		if (typeof text === "string" && text.trim()) {
			const classification = await classifyDocument(text);
			await applyEnrichment({ classification, fileId, organizationId });
			chunkSource = text;
		} else if (file.kind === "image") {
			// Images are enriched with vision-extracted metadata (title, summary, OCR text,
			// date, language, tags) but never chunked or embedded — the details live on the
			// file record, not in the RAG index.
			const classification = await classifyImage(file);
			await applyEnrichment({ classification, fileId, organizationId });
			await markReady({ fileId, organizationId });
			return;
		} else if (file.kind === "document" || file.kind === "text") {
			const extracted = await extractDocumentText(file);

			if (!extracted) {
				// File is still usable; there is just nothing to index.
				await markReady({ fileId, organizationId });
				return;
			}

			const classification = await classifyDocument(extracted);
			await applyEnrichment({ classification, fileId, organizationId });
			chunkSource = extracted;
		} else {
			// audio / video / other: stored and referenceable, but not indexed.
			await markReady({ fileId, organizationId });
			return;
		}

		await clearChunks({ fileId, organizationId });

		if (chunkSource.trim()) {
			const chunks = await chunkContent({ source: file.name, text: chunkSource });
			const batches = batch<IngestChunk>(chunks, EMBED_BATCH_SIZE);

			await Promise.all(
				batches.map((chunkBatch) => embedAndInsertChunks({ chunks: chunkBatch, fileId, organizationId }))
			);
		}

		await markReady({ fileId, organizationId });
	} catch (error) {
		await markFailed({
			error: error instanceof Error ? error.message : "Failed to process file",
			fileId,
			organizationId,
		});
		throw error;
	}
};
