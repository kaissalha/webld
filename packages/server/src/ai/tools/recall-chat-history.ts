import { tool } from "ai";
import { z } from "zod";

import { getBlockMessages, messagePartsToText, searchChatBlocks } from "../../services/memory";
import { appContextSchema } from "../types";

const RECALL_TRANSCRIPT_CHAR_LIMIT = 16_000;

const blockMatchSchema = z.object({
	blockId: z.string(),
	score: z.number(),
	summary: z.string(),
	tags: z.array(z.string()),
	title: z.string(),
});

export const recallChatHistoryTool = tool({
	description:
		"Read back earlier parts of this conversation that were compacted into summary blocks. Pass blockId (from the <conversation-blocks> context) to get that segment's verbatim messages, or pass query to find which blocks cover a topic before expanding one.",
	contextSchema: appContextSchema,
	inputSchema: z.object({
		blockId: z.string().optional().describe("ID of a conversation block to expand into its verbatim messages"),
		query: z.string().optional().describe("Natural-language topic to locate across this chat's compacted blocks"),
	}),
	outputSchema: z.object({
		error: z.string().optional(),
		found: z.boolean(),
		matches: z.array(blockMatchSchema).optional(),
		message: z.string(),
		status: z.enum(["loading", "success", "error"]),
		transcript: z.string().optional(),
	}),
	async *execute({ blockId, query }, { context }) {
		yield {
			found: false,
			message: "Recalling earlier conversation...",
			status: "loading",
		};

		if (!context.organizationId || !context.chatId) {
			yield {
				error: "Chat context not found",
				found: false,
				message: "Chat context not found",
				status: "error",
			};
			return;
		}

		if (!blockId && !query?.trim()) {
			yield {
				error: "Provide blockId or query",
				found: false,
				message: "Provide a blockId to expand or a query to locate blocks.",
				status: "error",
			};
			return;
		}

		try {
			if (blockId) {
				const result = await getBlockMessages({
					blockId,
					chatId: context.chatId,
					organizationId: context.organizationId,
				});

				if (!result || result.messages.length === 0) {
					yield {
						found: false,
						message: "No messages found for that block id.",
						status: "success",
					};
					return;
				}

				let transcript = result.messages
					.map((message) => `${message.role}: ${messagePartsToText(message.parts)}`.trim())
					.filter((line) => line.length > 0)
					.join("\n");

				let message = `Verbatim messages from block "${result.block.title}".`;

				if (transcript.length > RECALL_TRANSCRIPT_CHAR_LIMIT) {
					transcript = transcript.slice(0, RECALL_TRANSCRIPT_CHAR_LIMIT);
					message = `Verbatim messages from block "${result.block.title}" (truncated - the segment is long; rely on the block summary for the rest or ask the user).`;
				}

				yield {
					found: true,
					message,
					status: "success",
					transcript,
				};
				return;
			}

			const results = await searchChatBlocks({
				chatId: context.chatId,
				organizationId: context.organizationId,
				query: query ?? "",
			});

			if (results.length === 0) {
				yield {
					found: false,
					matches: [],
					message: "No compacted blocks matched that topic.",
					status: "success",
				};
				return;
			}

			yield {
				found: true,
				matches: results.map((result) => ({
					blockId: result.block.id,
					score: result.similarity,
					summary: result.block.summary,
					tags: result.block.tags,
					title: result.block.title,
				})),
				message: "Matching blocks found. Call recallChatHistory again with a blockId to read one verbatim.",
				status: "success",
			};
		} catch (error) {
			yield {
				error: error instanceof Error ? error.message : "Failed to recall chat history",
				found: false,
				message: "Failed to recall chat history",
				status: "error",
			};
		}
	},
});
