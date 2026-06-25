import { tool } from "ai";
import { z } from "zod";

import { formatFileChunksForContext, getFileChunkNeighbors, getFileChunksByIds } from "../../services/rag";
import type { RetrievedFileChunk } from "../../services/rag";
import { appContextSchema } from "../types";

const knowledgeContentChunkSchema = z.object({
	chunkId: z.string(),
	citation: z.string(),
	content: z.string(),
	document: z.object({
		id: z.string(),
		name: z.string(),
		source: z.string().nullable(),
	}),
});

export const getKnowledgeContentTool = tool({
	description:
		"Fetch the full content of specific knowledge-base chunks by their IDs. Use this after retrieveKnowledge to read the passages you need before answering. Set includeNeighbors to also pull the surrounding chunks for more context.",
	contextSchema: appContextSchema,
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
	async *execute({ chunkIds, includeNeighbors, neighborRadius }, { context }) {
		yield {
			found: false,
			message: "Loading knowledge-base content...",
			status: "loading",
		};

		if (!context.organizationId) {
			yield {
				error: "Organization context not found",
				found: false,
				message: "Organization context not found",
				status: "error",
			};
			return;
		}

		try {
			const organizationId = context.organizationId;
			const baseChunks = await getFileChunksByIds({ chunkIds, organizationId });

			const neighborChunks = includeNeighbors
				? (
						await Promise.all(
							chunkIds.map((chunkId) =>
								getFileChunkNeighbors({ chunkId, organizationId, radius: neighborRadius })
							)
						)
					).flat()
				: [];

			const byChunkId = new Map<string, RetrievedFileChunk>();

			for (const chunk of [...baseChunks, ...neighborChunks]) {
				byChunkId.set(chunk.chunkId, chunk);
			}

			const chunks = Array.from(byChunkId.values()).toSorted((a, b) => {
				if (a.file.id !== b.file.id) {
					return a.file.id.localeCompare(b.file.id);
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
					document: {
						id: chunk.file.id,
						name: chunk.file.title ?? chunk.file.name,
						source: chunk.file.source,
					},
				})),
				context: formatFileChunksForContext({ chunks }),
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
