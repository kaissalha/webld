import { tool } from "ai";
import { z } from "zod";

import { formatRagChunksForContext, retrieveRagChunks } from "../../services/rag";
import type { AppContext } from "../types";

const retrievedKnowledgeChunkSchema = z.object({
	citation: z.string(),
	content: z.string(),
	document: z.object({
		id: z.string(),
		name: z.string(),
		source: z.string().nullable(),
		sourceType: z.enum(["text", "file", "url"]),
	}),
	similarity: z.number(),
});

export const retrieveKnowledgeTool = tool({
	description:
		"Search indexed organization knowledge using semantic retrieval. Use this before answering questions about uploaded documents, policies, protocols, guides, or other knowledge-base content.",
	inputSchema: z.object({
		query: z.string().min(1).describe("The focused semantic search query to run against the knowledge base"),
		similarityThreshold: z.number().min(0).max(1).optional().default(0.4),
		topK: z.number().min(1).max(10).optional().default(5),
	}),
	outputSchema: z.object({
		chunks: z.array(retrievedKnowledgeChunkSchema).optional(),
		context: z.string().optional(),
		error: z.string().optional(),
		found: z.boolean(),
		message: z.string(),
		status: z.enum(["loading", "success", "error"]),
	}),
	async *execute({ query, similarityThreshold, topK }, { experimental_context }) {
		const ctx = experimental_context as AppContext;

		yield {
			found: false,
			message: "Searching organization knowledge...",
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
			const chunks = await retrieveRagChunks({
				organizationId: ctx.organizationId,
				query,
				similarityThreshold,
				topK,
			});

			if (chunks.length === 0) {
				yield {
					chunks: [],
					found: false,
					message: "No relevant knowledge-base chunks were found.",
					status: "success",
				};
				return;
			}

			yield {
				chunks: chunks.map((chunk, index) => ({
					citation: `[${index + 1}]`,
					content: chunk.content,
					document: chunk.document,
					similarity: chunk.similarity,
				})),
				context: formatRagChunksForContext({ chunks }),
				found: true,
				message: `Found ${chunks.length} relevant knowledge-base chunk(s).`,
				status: "success",
			};
		} catch (error) {
			yield {
				error: error instanceof Error ? error.message : "Failed to search organization knowledge",
				found: false,
				message: "Failed to search organization knowledge",
				status: "error",
			};
		}
	},
});
