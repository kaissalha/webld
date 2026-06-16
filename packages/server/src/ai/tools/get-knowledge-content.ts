import { tool } from "ai";
import { z } from "zod";

import { formatRagChunksForContext, getRagChunkNeighbors, getRagChunksByIds } from "../../services/rag";
import type { RetrievedRagChunk } from "../../services/rag";
import type { AppContext } from "../types";

const knowledgeContentChunkSchema = z.object({
	chunkId: z.string(),
	citation: z.string(),
	content: z.string(),
	document: z.object({
		id: z.string(),
		name: z.string(),
		source: z.string().nullable(),
		sourceType: z.enum(["text", "file", "url"]),
	}),
});

export const getKnowledgeContentTool = tool({
	description:
		"Fetch the full content of specific knowledge-base chunks by their IDs. Use this after retrieveKnowledge to read the passages you need before answering. Set includeNeighbors to also pull the surrounding chunks for more context.",
	inputSchema: z.object({
		chunkIds: z.array(z.string().min(1)).min(1).describe("Chunk IDs returned by retrieveKnowledge"),
		includeNeighbors: z
			.boolean()
			.optional()
			.default(false)
			.describe("Also include the chunks immediately before and after each requested chunk"),
		neighborRadius: z.number().min(1).max(3).optional().default(1),
	}),
	outputSchema: z.object({
		chunks: z.array(knowledgeContentChunkSchema).optional(),
		context: z.string().optional(),
		error: z.string().optional(),
		found: z.boolean(),
		message: z.string(),
		status: z.enum(["loading", "success", "error"]),
	}),
	async *execute({ chunkIds, includeNeighbors, neighborRadius }, { experimental_context }) {
		const ctx = experimental_context as AppContext;

		yield {
			found: false,
			message: "Loading knowledge-base content...",
			status: "loading",
		};

		if (!ctx.organizationId) {
			yield {
				error: "Organization context not found",
				found: false,
				message: "Organization context not found",
				status: "error",
			};
			return;
		}

		try {
			const organizationId = ctx.organizationId;
			const baseChunks = await getRagChunksByIds({ chunkIds, organizationId });

			const neighborChunks = includeNeighbors
				? (
						await Promise.all(
							chunkIds.map((chunkId) =>
								getRagChunkNeighbors({ chunkId, organizationId, radius: neighborRadius })
							)
						)
					).flat()
				: [];

			const byChunkId = new Map<string, RetrievedRagChunk>();

			for (const chunk of [...baseChunks, ...neighborChunks]) {
				byChunkId.set(chunk.chunkId, chunk);
			}

			const chunks = Array.from(byChunkId.values()).toSorted((a, b) => {
				if (a.document.id !== b.document.id) {
					return a.document.id.localeCompare(b.document.id);
				}

				return a.chunkIndex - b.chunkIndex;
			});

			if (chunks.length === 0) {
				yield {
					chunks: [],
					found: false,
					message: "No matching knowledge-base content was found for those IDs.",
					status: "success",
				};
				return;
			}

			yield {
				chunks: chunks.map((chunk, index) => ({
					chunkId: chunk.chunkId,
					citation: `[${index + 1}]`,
					content: chunk.content,
					document: chunk.document,
				})),
				context: formatRagChunksForContext({ chunks }),
				found: true,
				message: `Loaded ${chunks.length} knowledge-base chunk(s).`,
				status: "success",
			};
		} catch (error) {
			yield {
				error: error instanceof Error ? error.message : "Failed to load knowledge-base content",
				found: false,
				message: "Failed to load knowledge-base content",
				status: "error",
			};
		}
	},
});
