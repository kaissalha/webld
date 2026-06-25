import type { InferUITools, UIMessage } from "ai";
import { z } from "zod";

import type { dashboardChatTools } from "./tools";

/**
 * Shared app context passed through AI agents and into tools.
 */
export const appContextSchema = z
	.object({
		organizationId: z.string().optional(),
		userId: z.string().optional(),
		currentUser: z
			.object({
				email: z.string().optional(),
				name: z.string().optional(),
			})
			.optional(),
		conversationHistory: z
			.array(
				z.object({
					role: z.enum(["user", "assistant"]),
					content: z.string(),
				})
			)
			.optional(),
		memoryContext: z.string().optional(),
		locale: z.string().optional(),
		timezone: z.string().optional(),
	})
	.strict();

export type AppContext = z.infer<typeof appContextSchema>;

/**
 * Base message metadata shared across all chat types
 */
export type BaseMessageMetadata = {
	createdAt?: string;
};

/**
 * Base custom UI data types shared across all chat types
 */
export type BaseCustomUIDataTypes = {
	attachment: {
		fileId: string;
		filename: string;
		mediaType: string;
	};
	error: {
		message: string;
	};
	"chat-created": {
		chatId: string;
	};
	"append-message": string;
	"title-generated": undefined;
};

/**
 * Chat tool types inferred from dashboard chat tool registry
 */
export type DashboardChatTools = InferUITools<typeof dashboardChatTools>;

/**
 * Base ChatUIMessage type that all specific chat message types should extend.
 * `UIMessage` is invariant on its type parameters; `any` is the practical supertype for app chat messages.
 */
// oxlint-disable-next-line typescript/no-explicit-any
export type BaseChatUIMessage = UIMessage<any, any, any>;

/**
 * Dashboard chat message type (no additional custom data)
 */
export type DashboardChatUIMessage = UIMessage<BaseMessageMetadata, BaseCustomUIDataTypes, DashboardChatTools>;

/**
 * Async generator that yields values from a ReadableStream.
 * Useful for tRPC streaming mutations with createUIMessageStream.
 */
export const streamToAsyncIterable = async function* <T>(stream: ReadableStream<T>) {
	const reader = stream.getReader();
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			yield value;
		}
	} finally {
		reader.releaseLock();
	}
};
