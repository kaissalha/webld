import { embed, embedMany, generateText, Output } from "ai";
import { and, asc, cosineDistance, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { createHash } from "node:crypto";

import { embeddingModels, models } from "@webld/ai/models";
import { ragRerankSchema, ragRerankSystemPrompt } from "@webld/ai/prompts";
import { buildSearchQuery, db, type FileKind, type FileMetadata, fileChunks, files } from "@webld/db";

export type FileChunkMetadata = {
	chunkIndex: number;
	chunkType?: "prose" | "code" | "list" | "table" | "mixed" | "ocr" | "description";
	endChar?: number;
	heading?: string;
	previousHeading?: string;
	source?: string;
	startChar?: number;
};

export type RetrievedFileChunk = {
	chunkId: string;
	chunkIndex: number;
	content: string;
	file: {
		id: string;
		kind: FileKind;
		name: string;
		source: string | null;
		title: string | null;
		url: string | null;
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

export const hashText = ({ text }: { text: string }) => createHash("sha256").update(text).digest("hex");

const detectChunkType = ({ text }: { text: string }): FileChunkMetadata["chunkType"] => {
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

export const chunkText = ({
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
	const chunks: Array<{ metadata: FileChunkMetadata; text: string }> = [];
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

type EmbeddedChunk = {
	chunkIndex: number;
	content: string;
	embedding: number[];
	metadata: Record<string, unknown>;
};

/** Delete all chunks for a file. Called before re-inserting on (re)ingestion. */
export const clearFileChunks = async ({ fileId, organizationId }: { fileId: string; organizationId: string }) => {
	await db
		.delete(fileChunks)
		.where(and(eq(fileChunks.fileId, fileId), eq(fileChunks.organizationId, organizationId)));
};

/** Insert a batch of already-embedded chunks for a file. */
export const insertFileChunks = async ({
	chunks,
	fileId,
	organizationId,
}: {
	chunks: EmbeddedChunk[];
	fileId: string;
	organizationId: string;
}) => {
	if (chunks.length === 0) {
		return { chunkCount: 0 };
	}

	await db
		.insert(fileChunks)
		.values(
			chunks.map((chunk) => ({
				chunkIndex: chunk.chunkIndex,
				content: chunk.content,
				embedding: chunk.embedding,
				fileId,
				metadata: chunk.metadata,
				organizationId,
			}))
		)
		// Idempotent: a queue-redelivered batch (insert committed, step reported failed) won't
		// collide on the (file_id, chunk_index) unique index.
		.onConflictDoNothing();

	return { chunkCount: chunks.length };
};

const RRF_K = 60;
const FILE_CANDIDATES_PER_RETRIEVER = 30;
const SNIPPET_LENGTH = 150;

export type RagRerankConversationMessage = {
	content: string;
	role: "assistant" | "user";
};

const fileChunkColumns = {
	chunkId: fileChunks.id,
	chunkIndex: fileChunks.chunkIndex,
	content: fileChunks.content,
	fileId: files.id,
	fileKind: files.kind,
	fileMetadata: files.metadata,
	fileName: files.name,
	fileTitle: files.title,
	fileUrl: files.url,
	metadata: fileChunks.metadata,
};

type FileChunkRow = {
	chunkId: string;
	chunkIndex: number;
	content: string;
	fileId: string;
	fileKind: FileKind;
	fileMetadata: FileMetadata;
	fileName: string;
	fileTitle: string | null;
	fileUrl: string | null;
	metadata: Record<string, unknown>;
};

const toRetrievedFileChunk = ({ row, score }: { row: FileChunkRow; score: number }): RetrievedFileChunk => {
	const sourceUrl = row.fileMetadata.sourceUrl?.trim();
	const source = sourceUrl || row.fileUrl;

	return {
		chunkId: row.chunkId,
		chunkIndex: row.chunkIndex,
		content: row.content,
		file: {
			id: row.fileId,
			kind: row.fileKind,
			name: row.fileName,
			source,
			title: row.fileTitle,
			url: row.fileUrl,
		},
		metadata: row.metadata,
		similarity: score,
	};
};

export const createFileChunkSnippet = ({ content }: { content: string }) => {
	const normalized = content.replaceAll(/\s+/gu, " ").trim();

	if (normalized.length <= SNIPPET_LENGTH) {
		return normalized;
	}

	return `${normalized.slice(0, SNIPPET_LENGTH).trim()}...`;
};

export const searchFileChunksBySemantic = async ({
	limit = FILE_CANDIDATES_PER_RETRIEVER,
	organizationId,
	query,
}: {
	limit?: number;
	organizationId: string;
	query: string;
}): Promise<RetrievedFileChunk[]> => {
	if (!query.trim()) {
		return [];
	}

	const queryEmbedding = await generateRagEmbedding({ value: query });
	const similarity = sql<number>`1 - (${cosineDistance(fileChunks.embedding, queryEmbedding)})`;

	const rows = await db
		.select({ ...fileChunkColumns, score: similarity })
		.from(fileChunks)
		.innerJoin(files, eq(fileChunks.fileId, files.id))
		.where(
			and(
				eq(fileChunks.organizationId, organizationId),
				eq(files.organizationId, organizationId),
				eq(files.ragStatus, "ready")
			)
		)
		.orderBy((row) => desc(row.score))
		.limit(limit);

	return rows
		.filter((row) => row.content.trim().length > 0)
		.map((row) => toRetrievedFileChunk({ row, score: Number(row.score) }));
};

export const searchFileChunksByKeyword = async ({
	limit = FILE_CANDIDATES_PER_RETRIEVER,
	organizationId,
	query,
}: {
	limit?: number;
	organizationId: string;
	query: string;
}): Promise<RetrievedFileChunk[]> => {
	const tsquery = buildSearchQuery(query);

	if (!tsquery) {
		return [];
	}

	const rank = sql<number>`ts_rank(${fileChunks.fts}, to_tsquery('english', ${tsquery}))`;

	const rows = await db
		.select({ ...fileChunkColumns, score: rank })
		.from(fileChunks)
		.innerJoin(files, eq(fileChunks.fileId, files.id))
		.where(
			and(
				eq(fileChunks.organizationId, organizationId),
				eq(files.organizationId, organizationId),
				eq(files.ragStatus, "ready"),
				sql`${fileChunks.fts} @@ to_tsquery('english', ${tsquery})`
			)
		)
		.orderBy((row) => desc(row.score))
		.limit(limit);

	return rows
		.filter((row) => row.content.trim().length > 0)
		.map((row) => toRetrievedFileChunk({ row, score: Number(row.score) }));
};

export const reciprocalRankFusion = <T>({
	k = RRF_K,
	rankings,
	toId,
}: {
	k?: number;
	rankings: T[][];
	toId: (item: T) => string;
}): { item: T; score: number }[] => {
	const fusedScores = new Map<string, number>();
	const itemsById = new Map<string, T>();

	for (const ranking of rankings) {
		ranking.forEach((item, rank) => {
			const id = toId(item);
			fusedScores.set(id, (fusedScores.get(id) ?? 0) + 1 / (k + rank));
			itemsById.set(id, item);
		});
	}

	return Array.from(fusedScores.entries())
		.sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
		.flatMap(([id, score]) => {
			const item = itemsById.get(id);

			return item ? [{ item, score }] : [];
		});
};

export const rerankFileChunks = async ({
	candidates,
	conversationHistory = [],
	query,
	topK = 5,
}: {
	candidates: RetrievedFileChunk[];
	conversationHistory?: RagRerankConversationMessage[];
	query: string;
	topK?: number;
}): Promise<RetrievedFileChunk[]> => {
	if (candidates.length <= 1) {
		return candidates.slice(0, topK);
	}

	try {
		const { output } = await generateText({
			...models.rerank,
			output: Output.object({
				schema: ragRerankSchema,
			}),
			instructions: ragRerankSystemPrompt,
			messages: [
				...conversationHistory,
				{
					role: "user",
					content: `Search query: ${query}\n\nCandidate chunks:\n${candidates
						.map(
							(candidate, index) =>
								`[${index}] (from ${candidate.file.title ?? candidate.file.name})\n${candidate.content}`
						)
						.join("\n\n")}`,
				},
			],
		});

		const reranked = output.resultIds
			.filter((id) => Number.isInteger(id) && id >= 0 && id < candidates.length)
			.flatMap((id) => {
				const candidate = candidates[id];

				return candidate ? [candidate] : [];
			});

		if (reranked.length === 0) {
			return candidates.slice(0, topK);
		}

		return reranked.slice(0, topK);
	} catch {
		return candidates.slice(0, topK);
	}
};

/**
 * Hybrid retrieval: keyword (Postgres full-text search) + semantic (pgvector)
 * fused with reciprocal rank fusion, then reranked by a cheap LLM.
 */
export const retrieveFileChunks = async ({
	conversationHistory,
	keywords,
	organizationId,
	searchQuery,
	topK = 5,
}: {
	conversationHistory?: RagRerankConversationMessage[];
	keywords?: string[];
	organizationId: string;
	searchQuery?: string;
	topK?: number;
}): Promise<RetrievedFileChunk[]> => {
	const keywordQuery = keywords?.length ? keywords.join(" ") : (searchQuery ?? "");
	const semanticQuery = searchQuery?.trim() ? searchQuery : (keywords?.join(" ") ?? "");

	const [keywordResults, semanticResults] = await Promise.all([
		keywordQuery ? searchFileChunksByKeyword({ organizationId, query: keywordQuery }) : Promise.resolve([]),
		semanticQuery ? searchFileChunksBySemantic({ organizationId, query: semanticQuery }) : Promise.resolve([]),
	]);

	const fused = reciprocalRankFusion({
		rankings: [keywordResults, semanticResults],
		toId: (chunk) => chunk.chunkId,
	});

	if (fused.length === 0) {
		return [];
	}

	const candidates = fused
		.slice(0, FILE_CANDIDATES_PER_RETRIEVER)
		.map(({ item, score }) => ({ ...item, similarity: score }));

	const query = [keywords?.join(" "), searchQuery].filter(Boolean).join(" ");

	return rerankFileChunks({ candidates, conversationHistory, query, topK });
};

export const getFileChunksByIds = async ({
	chunkIds,
	organizationId,
}: {
	chunkIds: string[];
	organizationId: string;
}): Promise<RetrievedFileChunk[]> => {
	if (chunkIds.length === 0) {
		return [];
	}

	const rows = await db
		.select(fileChunkColumns)
		.from(fileChunks)
		.innerJoin(files, eq(fileChunks.fileId, files.id))
		.where(
			and(
				eq(fileChunks.organizationId, organizationId),
				eq(files.organizationId, organizationId),
				inArray(fileChunks.id, chunkIds)
			)
		);

	const orderById = new Map(chunkIds.map((id, index) => [id, index]));

	return rows
		.toSorted((a, b) => (orderById.get(a.chunkId) ?? 0) - (orderById.get(b.chunkId) ?? 0))
		.map((row) => toRetrievedFileChunk({ row, score: 0 }));
};

export const getFileChunkNeighbors = async ({
	chunkId,
	organizationId,
	radius = 1,
}: {
	chunkId: string;
	organizationId: string;
	radius?: number;
}): Promise<RetrievedFileChunk[]> => {
	const [target] = await db
		.select({ chunkIndex: fileChunks.chunkIndex, fileId: fileChunks.fileId })
		.from(fileChunks)
		.where(and(eq(fileChunks.id, chunkId), eq(fileChunks.organizationId, organizationId)))
		.limit(1);

	if (!target) {
		return [];
	}

	const rows = await db
		.select(fileChunkColumns)
		.from(fileChunks)
		.innerJoin(files, eq(fileChunks.fileId, files.id))
		.where(
			and(
				eq(fileChunks.organizationId, organizationId),
				eq(files.organizationId, organizationId),
				eq(fileChunks.fileId, target.fileId),
				gte(fileChunks.chunkIndex, target.chunkIndex - radius),
				lte(fileChunks.chunkIndex, target.chunkIndex + radius)
			)
		)
		.orderBy(asc(fileChunks.chunkIndex));

	return rows.map((row) => toRetrievedFileChunk({ row, score: 0 }));
};

export const formatFileChunksForContext = ({ chunks }: { chunks: RetrievedFileChunk[] }) =>
	chunks
		.map((chunk, index) => {
			const citationId = `[${index + 1}]`;
			const name = chunk.file.title ?? chunk.file.name;
			const source = chunk.file.source ? ` (${chunk.file.source})` : "";

			return `${citationId} ${chunk.content}\nSource: ${name}${source}`;
		})
		.join("\n\n");
