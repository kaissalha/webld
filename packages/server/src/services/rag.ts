import { embed, embedMany } from "ai";
import { and, cosineDistance, desc, eq, sql } from "drizzle-orm";
import { createHash } from "node:crypto";

import { embeddingModels } from "@starter/ai/models";
import { db, ragDocumentChunks, ragDocuments } from "@starter/db";

const RAG_DOCUMENT_WAIT_INTERVAL_MS = 1500;
const RAG_DOCUMENT_WAIT_TIMEOUT_MS = 4.5 * 60 * 1000;

export type RagChunkMetadata = {
	chunkIndex: number;
	chunkType?: "prose" | "code" | "list" | "table" | "mixed";
	endChar?: number;
	heading?: string;
	previousHeading?: string;
	source?: string;
	startChar?: number;
};

export type RetrievedRagChunk = {
	chunkId: string;
	chunkIndex: number;
	content: string;
	document: {
		id: string;
		name: string;
		source: string | null;
		sourceType: "text" | "file" | "url";
	};
	metadata: Record<string, unknown>;
	similarity: number;
};

const codeBlockPattern = /```/u;
const indentedCodePattern = /^\s{4,}/mu;
const codeLikePattern = /^\s*[{}[\];=]+\s*$/mu;
const markdownListPattern = /^[\s]*[-*+]\s/mu;
const numberedListPattern = /^[\s]*\d+[.)]\s/mu;
const markdownHeadingPattern = /^#{1,6}\s+(.+)$/mu;
const capitalizedLinePattern = /^[A-Z]/u;
const endingPunctuationPattern = /[.!?]$/u;

const getContentHash = ({ text }: { text: string }) => createHash("sha256").update(text).digest("hex");

const detectChunkType = ({ text }: { text: string }): RagChunkMetadata["chunkType"] => {
	const trimmed = text.trim();

	if (codeBlockPattern.test(trimmed) || indentedCodePattern.test(trimmed) || codeLikePattern.test(trimmed)) {
		return "code";
	}

	if (markdownListPattern.test(trimmed) || numberedListPattern.test(trimmed)) {
		return "list";
	}

	if (trimmed.includes("|") && trimmed.split("\n").filter((line) => line.includes("|")).length >= 2) {
		return "table";
	}

	const hasCode = codeBlockPattern.test(trimmed) || indentedCodePattern.test(trimmed);
	const hasList = markdownListPattern.test(trimmed) || numberedListPattern.test(trimmed);

	if ((hasCode || hasList) && trimmed.length > 200) {
		return "mixed";
	}

	return "prose";
};

const extractHeading = ({ maxLength = 100, text }: { maxLength?: number; text: string }) => {
	const markdownHeading = markdownHeadingPattern.exec(text);

	if (markdownHeading?.[1]) {
		return markdownHeading[1].trim().slice(0, maxLength);
	}

	return text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.slice(0, 3)
		.find((line) => {
			return (
				line.length < 80 &&
				line.length > 5 &&
				capitalizedLinePattern.test(line) &&
				!endingPunctuationPattern.test(line) &&
				line.split(" ").length < 15
			);
		})
		?.slice(0, maxLength);
};

export const chunkRagText = ({
	chunkSize = 2000,
	minChunkSize = 100,
	overlap = 200,
	separators = ["\n\n\n", "\n\n", "\n", ". ", "! ", "? ", " ", ""],
	text,
}: {
	chunkSize?: number;
	minChunkSize?: number;
	overlap?: number;
	separators?: string[];
	text: string;
}) => {
	const chunks: Array<{ metadata: RagChunkMetadata; text: string }> = [];
	let currentIndex = 0;
	let chunkIndex = 0;
	let previousHeading: string | undefined;

	while (currentIndex < text.length) {
		const endIndex = Math.min(currentIndex + chunkSize, text.length);
		let splitIndex = endIndex;
		let bestSeparator: string | null = null;

		if (endIndex < text.length) {
			for (const separator of separators) {
				const lastIndex = text.lastIndexOf(separator, endIndex);
				const minSplitPoint = currentIndex + chunkSize * 0.5;

				if (lastIndex > minSplitPoint) {
					splitIndex = separator ? lastIndex + separator.length : lastIndex;
					bestSeparator = separator;
					break;
				}
			}

			if (splitIndex === endIndex && bestSeparator === null) {
				for (const ending of [". ", "! ", "? ", ".\n", "!\n", "?\n"]) {
					const lastIndex = text.lastIndexOf(ending, endIndex);

					if (lastIndex > currentIndex + chunkSize * 0.3) {
						splitIndex = lastIndex + ending.length;
						break;
					}
				}
			}
		}

		const chunkContent = text.slice(currentIndex, splitIndex).trim();

		if ((chunkContent.length >= minChunkSize || splitIndex >= text.length) && chunkContent.length > 0) {
			const heading = extractHeading({ text: chunkContent });
			chunks.push({
				text: chunkContent,
				metadata: {
					chunkIndex,
					chunkType: detectChunkType({ text: chunkContent }),
					endChar: splitIndex,
					heading: heading || previousHeading,
					previousHeading: chunkIndex > 0 ? chunks[chunkIndex - 1]?.metadata.heading : undefined,
					startChar: currentIndex,
				},
			});
			previousHeading = heading || previousHeading;
			chunkIndex += 1;
		}

		if (splitIndex >= text.length) {
			break;
		}

		const overlapSize =
			bestSeparator === "\n\n" || bestSeparator === "\n\n\n" ? Math.min(overlap * 1.5, chunkSize * 0.3) : overlap;
		const minForwardMovement = Math.max(chunkSize * 0.1, minChunkSize * 0.5);
		const previousIndex = currentIndex;
		const nextIndex = Math.max(splitIndex - overlapSize, currentIndex + minForwardMovement);

		currentIndex = Math.min(nextIndex, splitIndex);

		if (currentIndex >= splitIndex) {
			currentIndex = splitIndex;
		}

		if (currentIndex === previousIndex && currentIndex < text.length) {
			currentIndex = Math.min(currentIndex + minForwardMovement, splitIndex);
		}
	}

	return chunks;
};

export const generateRagEmbedding = async ({ value }: { value: string }) => {
	const { embedding } = await embed({
		model: embeddingModels.rag.model,
		providerOptions: {
			google: {
				outputDimensionality: embeddingModels.rag.dimensions,
			},
		},
		value: value.replaceAll("\n", " "),
	});

	return embedding;
};

export const generateRagEmbeddings = async ({ values }: { values: string[] }) => {
	if (values.length === 0) {
		return [];
	}

	const { embeddings } = await embedMany({
		maxParallelCalls: 2,
		model: embeddingModels.rag.model,
		providerOptions: {
			google: {
				outputDimensionality: embeddingModels.rag.dimensions,
			},
		},
		values,
	});

	return embeddings;
};

export const createPendingRagDocument = async ({
	contentHash,
	metadata = {},
	name,
	organizationId,
	source,
	sourceType = "text",
}: {
	contentHash?: string;
	metadata?: Record<string, unknown>;
	name: string;
	organizationId: string;
	source?: string;
	sourceType?: "text" | "file" | "url";
}) => {
	const [document] = await db
		.insert(ragDocuments)
		.values({
			contentHash: contentHash ?? null,
			metadata,
			name,
			organizationId,
			source,
			sourceType,
			status: "pending",
		})
		.returning();

	if (!document) {
		throw new Error("Failed to create RAG document");
	}

	return document;
};

export const getRagDocument = async ({
	documentId,
	organizationId,
}: {
	documentId: string;
	organizationId: string;
}) => {
	const [document] = await db
		.select()
		.from(ragDocuments)
		.where(and(eq(ragDocuments.id, documentId), eq(ragDocuments.organizationId, organizationId)))
		.limit(1);

	return document ?? null;
};

const waitForDocumentPollInterval = ({ signal }: { signal?: AbortSignal }) =>
	new Promise<void>((resolve, reject) => {
		if (signal?.aborted) {
			reject(new Error("RAG document wait cancelled"));
			return;
		}

		const handleAbort = () => {
			clearTimeout(timeoutId);
			reject(new Error("RAG document wait cancelled"));
		};
		const timeoutId = setTimeout(() => {
			signal?.removeEventListener("abort", handleAbort);
			resolve();
		}, RAG_DOCUMENT_WAIT_INTERVAL_MS);

		signal?.addEventListener("abort", handleAbort, { once: true });
	});

export const waitForRagDocumentsReady = async ({
	documentIds,
	organizationId,
	signal,
	timeoutMs = RAG_DOCUMENT_WAIT_TIMEOUT_MS,
}: {
	documentIds: string[];
	organizationId: string;
	signal?: AbortSignal;
	timeoutMs?: number;
}) => {
	const uniqueDocumentIds = Array.from(new Set(documentIds));
	const start = Date.now();

	if (uniqueDocumentIds.length === 0) {
		return [];
	}

	while (Date.now() - start < timeoutMs) {
		if (signal?.aborted) {
			throw new Error("RAG document wait cancelled");
		}

		const documents = await Promise.all(
			uniqueDocumentIds.map((documentId) =>
				getRagDocument({
					documentId,
					organizationId,
				})
			)
		);
		const missingDocumentId = uniqueDocumentIds.find((_documentId, index) => !documents[index]);

		if (missingDocumentId) {
			throw new Error(`RAG document not found: ${missingDocumentId}`);
		}

		const failedDocument = documents.find((document) => document?.status === "failed");

		if (failedDocument) {
			throw new Error(failedDocument.error ?? `Failed to index ${failedDocument.name}`);
		}

		if (documents.every((document) => document?.status === "ready")) {
			return documents;
		}

		await waitForDocumentPollInterval({ signal });
	}

	throw new Error("Timed out waiting for attachments to finish indexing");
};

export const markRagDocumentFailed = async ({
	documentId,
	error,
	organizationId,
}: {
	documentId: string;
	error: string;
	organizationId: string;
}) => {
	await db
		.update(ragDocuments)
		.set({
			error,
			status: "failed",
			updatedAt: new Date().toISOString(),
		})
		.where(and(eq(ragDocuments.id, documentId), eq(ragDocuments.organizationId, organizationId)));
};

export const upsertRagTextDocument = async ({
	chunkSize,
	documentId,
	metadata = {},
	minChunkSize,
	name,
	organizationId,
	overlap,
	source,
	sourceType = "text",
	text,
}: {
	chunkSize?: number;
	documentId?: string;
	metadata?: Record<string, unknown>;
	minChunkSize?: number;
	name: string;
	organizationId: string;
	overlap?: number;
	source?: string;
	sourceType?: "text" | "file" | "url";
	text: string;
}) => {
	const content = text.trim();

	if (!content) {
		throw new Error("RAG document text is required");
	}

	const chunks = chunkRagText({ chunkSize, minChunkSize, overlap, text: content });
	const embeddings = await generateRagEmbeddings({ values: chunks.map((chunk) => chunk.text) });
	const now = new Date().toISOString();

	return db.transaction(async (tx) => {
		const [document] = documentId
			? await tx
					.update(ragDocuments)
					.set({
						contentHash: getContentHash({ text: content }),
						error: null,
						metadata,
						name,
						source,
						sourceType,
						status: "ready",
						updatedAt: now,
					})
					.where(and(eq(ragDocuments.id, documentId), eq(ragDocuments.organizationId, organizationId)))
					.returning()
			: await tx
					.insert(ragDocuments)
					.values({
						contentHash: getContentHash({ text: content }),
						metadata,
						name,
						organizationId,
						source,
						sourceType,
						status: "ready",
					})
					.returning();

		if (!document) {
			throw new Error("RAG document not found");
		}

		await tx.delete(ragDocumentChunks).where(eq(ragDocumentChunks.documentId, document.id));

		if (chunks.length > 0) {
			await tx.insert(ragDocumentChunks).values(
				chunks.map((chunk, index) => ({
					chunkIndex: chunk.metadata.chunkIndex,
					content: chunk.text,
					documentId: document.id,
					embedding: embeddings[index] ?? [],
					metadata: {
						...chunk.metadata,
						source,
					},
					organizationId,
				}))
			);
		}

		return {
			chunkCount: chunks.length,
			document,
		};
	});
};

export const retrieveRagChunks = async ({
	organizationId,
	query,
	similarityThreshold = 0.4,
	topK = 5,
}: {
	organizationId: string;
	query: string;
	similarityThreshold?: number;
	topK?: number;
}): Promise<RetrievedRagChunk[]> => {
	const queryEmbedding = await generateRagEmbedding({ value: query });
	const similarity = sql<number>`1 - (${cosineDistance(ragDocumentChunks.embedding, queryEmbedding)})`;
	const candidateLimit = Math.max(topK * 4, 20);

	const candidates = await db
		.select({
			chunkId: ragDocumentChunks.id,
			chunkIndex: ragDocumentChunks.chunkIndex,
			content: ragDocumentChunks.content,
			documentId: ragDocuments.id,
			documentName: ragDocuments.name,
			documentSource: ragDocuments.source,
			documentSourceType: ragDocuments.sourceType,
			metadata: ragDocumentChunks.metadata,
			similarity,
		})
		.from(ragDocumentChunks)
		.innerJoin(ragDocuments, eq(ragDocumentChunks.documentId, ragDocuments.id))
		.where(
			and(
				eq(ragDocumentChunks.organizationId, organizationId),
				eq(ragDocuments.organizationId, organizationId),
				eq(ragDocuments.status, "ready")
			)
		)
		.orderBy((row) => desc(row.similarity))
		.limit(candidateLimit);

	const usefulCandidates = candidates
		.map((candidate) => ({
			...candidate,
			similarity: Number(candidate.similarity),
		}))
		.filter((candidate) => candidate.content.trim().length > 0);
	const aboveThreshold = usefulCandidates.filter((candidate) => candidate.similarity >= similarityThreshold);
	const selectedCandidates = (aboveThreshold.length > 0 ? aboveThreshold : usefulCandidates).slice(0, topK);

	return selectedCandidates.map((candidate) => ({
		chunkId: candidate.chunkId,
		chunkIndex: candidate.chunkIndex,
		content: candidate.content,
		document: {
			id: candidate.documentId,
			name: candidate.documentName,
			source: candidate.documentSource,
			sourceType: candidate.documentSourceType,
		},
		metadata: candidate.metadata,
		similarity: candidate.similarity,
	}));
};

export const formatRagChunksForContext = ({ chunks }: { chunks: RetrievedRagChunk[] }) =>
	chunks
		.map((chunk, index) => {
			const citationId = `[${index + 1}]`;
			const source = chunk.document.source ? ` (${chunk.document.source})` : "";

			return `${citationId} ${chunk.content}\nSource: ${chunk.document.name}${source}`;
		})
		.join("\n\n");
