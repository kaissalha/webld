import { tool } from "ai";
import { z } from "zod";

import { createFileChunkSnippet, retrieveFileChunks } from "../../services/rag";
import { appContextSchema } from "../types";

const knowledgeSearchResultSchema = z.object({
	chunkId: z.string(),
	citation: z.string(),
	document: z.object({
		id: z.string(),
		name: z.string(),
		source: z.string().nullable(),
	}),
	score: z.number(),
	snippet: z.string(),
});

export const retrieveKnowledgeTool = tool({
	description:
		"Search indexed organization knowledge with hybrid keyword + semantic retrieval. Returns ranked snippets and chunk IDs only - call getKnowledgeContent with the chunk IDs you need to read the full passages before answering.",
	contextSchema: appContextSchema,
	inputSchema: z.object({
		keywords: z
			.array(z.string())
			.optional()
			.describe("Exact keywords for keyword search (names, codes, amounts, specific terminology)"),
		searchQuery: z
			.string()
			.optional()
			.describe("Natural language query describing the concept for semantic search"),
		topK: z.number().min(1).max(20).optional().default(8),
	}),
	outputSchema: z.object({
		error: z.string().optional(),
		found: z.boolean(),
		message: z.string(),
		results: z.array(knowledgeSearchResultSchema).optional(),
		status: z.enum(["loading", "success", "error"]),
	}),
	async *execute({ keywords, searchQuery, topK }, { context }) {
		yield {
			found: false,
			message: "Searching organization knowledge...",
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

		if (!keywords?.length && !searchQuery?.trim()) {
			yield {
				error: "Provide keywords or a searchQuery",
				found: false,
				message: "Provide keywords or a searchQuery to search the knowledge base.",
				status: "error",
			};
			return;
		}

		try {
			const chunks = await retrieveFileChunks({
				conversationHistory: context.conversationHistory,
				keywords,
				organizationId: context.organizationId,
				searchQuery,
				topK,
			});

			if (chunks.length === 0) {
				yield {
					found: false,
					message: "No relevant knowledge-base chunks were found.",
					results: [],
					status: "success",
				};
				return;
			}

			yield {
				found: true,
				message: `Found ${chunks.length} relevant chunk(s). Call getKnowledgeContent with the chunk IDs you want to read in full.`,
				results: chunks.map((chunk, index) => ({
					chunkId: chunk.chunkId,
					citation: `[${index + 1}]`,
					document: {
						id: chunk.file.id,
						name: chunk.file.title ?? chunk.file.name,
						source: chunk.file.source,
					},
					score: chunk.similarity,
					snippet: createFileChunkSnippet({ content: chunk.content }),
				})),
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
