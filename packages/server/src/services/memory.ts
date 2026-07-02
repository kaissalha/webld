import { convertToModelMessages, generateText, NoObjectGeneratedError, Output } from "ai";
import { and, asc, cosineDistance, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";

import { type ModelConfig, models } from "@webld/ai/models";
import {
	blockSummarySchema,
	blockSummarySystemPrompt,
	chatReflectionSchema,
	chatReflectionSystemPrompt,
	type MemoryForPrompt,
	memoryExtractionSchema,
	memoryExtractionSystemPrompt,
} from "@webld/ai/prompts";
import { aiChatBlocks, aiChatMessages, type ChatEpisode, chatEpisodes, db, type Memory, memories } from "@webld/db";

import type { BaseChatUIMessage } from "../ai/types";
import { generateRagEmbedding } from "./rag";

const DEFAULT_RELATED_CHATS_TOP_K = 3;

export type TextualPart = { type: string; [key: string]: unknown };
export type TextualMessage = { role: string; parts: TextualPart[] };

// =============================================================================
// Text utilities
// =============================================================================

export const messagePartsToText = (parts: TextualPart[]) =>
	parts
		.map((part) => (part.type === "text" && typeof part.text === "string" ? part.text : undefined))
		.filter((text): text is string => typeof text === "string")
		.join("\n");

export const messageToText = (message: TextualMessage) => `${message.role}: ${messagePartsToText(message.parts)}`;

/**
 * Converts message history into a semantic search query, repeating the most
 * recent message so it is overweighted in the embedding.
 */
export const messageHistoryToQuery = (messages: TextualMessage[]) => {
	const mostRecentMessage = messages.at(-1);
	const queryMessages = mostRecentMessage ? [...messages, mostRecentMessage] : messages;

	return queryMessages.map(messageToText).join("\n");
};

export const memoryToText = (memory: { title: string; content: string }) => `${memory.title}: ${memory.content}`;

export const episodeToText = (episode: Pick<ChatEpisode, "summary" | "tags" | "whatWorkedWell" | "whatToAvoid">) =>
	[
		`Summary: ${episode.summary}`,
		`What worked well: ${episode.whatWorkedWell}`,
		`What to avoid: ${episode.whatToAvoid}`,
		`Tags: ${episode.tags.join(", ")}`,
	].join("\n");

export const chatToText = ({ title, messages }: { title: string; messages: TextualMessage[] }) =>
	[`Title: ${title}`, ...messages.map(messageToText)].join("\n");

// =============================================================================
// Semantic memory
// =============================================================================

export const loadMemories = async ({ organizationId }: { organizationId: string }) =>
	db.select().from(memories).where(eq(memories.organizationId, organizationId));

export const createMemory = async ({
	content,
	organizationId,
	source = "chat",
	sourceChatId,
	title,
}: {
	content: string;
	organizationId: string;
	source?: Memory["source"];
	sourceChatId?: string | null;
	title: string;
}) => {
	const embedding = await generateRagEmbedding({ value: memoryToText({ content, title }) });

	const [memory] = await db
		.insert(memories)
		.values({
			content,
			embedding,
			organizationId,
			source,
			sourceChatId: sourceChatId ?? null,
			title,
		})
		.returning();

	return memory;
};

export const updateMemory = async ({
	content,
	id,
	organizationId,
	title,
}: {
	content: string;
	id: string;
	organizationId: string;
	title: string;
}) => {
	const embedding = await generateRagEmbedding({ value: memoryToText({ content, title }) });

	return db
		.update(memories)
		.set({ content, embedding, title, updatedAt: new Date().toISOString() })
		.where(and(eq(memories.id, id), eq(memories.organizationId, organizationId)));
};

export const deleteMemory = async ({ id, organizationId }: { id: string; organizationId: string }) =>
	db.delete(memories).where(and(eq(memories.id, id), eq(memories.organizationId, organizationId)));

/**
 * Runs the memory-extraction prompt over a conversation and returns the raw
 * additions/updates/deletions the model proposes. Pure (no DB I/O) so it can be
 * exercised directly by evals; callers persist the result.
 */
export const extractMemories = async ({
	existingMemories,
	messages,
	model = models.fast,
}: {
	existingMemories: MemoryForPrompt[];
	messages: BaseChatUIMessage[];
	model?: ModelConfig;
}) => {
	const filteredMessages = messages.filter((message) => message.role === "user" || message.role === "assistant");

	if (filteredMessages.length === 0) {
		return null;
	}

	const { output } = await generateText({
		...model,
		output: Output.object({
			schema: memoryExtractionSchema,
		}),
		instructions: memoryExtractionSystemPrompt({ memories: existingMemories }),
		messages: await convertToModelMessages(filteredMessages),
	});

	return output;
};

/**
 * Extracts permanent facts from a conversation and reconciles them with the
 * existing org-scoped memory bank (additions, updates, deletions).
 */
export const extractAndUpdateMemories = async ({
	chatId,
	messages,
	organizationId,
}: {
	chatId: string;
	messages: BaseChatUIMessage[];
	organizationId: string;
}) => {
	const existingMemories = await loadMemories({ organizationId });

	const output = await extractMemories({
		existingMemories: existingMemories.map((memory) => ({ id: memory.id, text: memoryToText(memory) })),
		messages,
	});

	if (!output) {
		return;
	}

	const { additions, deletions, updates } = output;
	const filteredDeletions = deletions.filter((deletion) => !updates.some((update) => update.id === deletion));

	await Promise.all([
		...updates.map((update) =>
			updateMemory({ content: update.content, id: update.id, organizationId, title: update.title })
		),
		...filteredDeletions.map((id) => deleteMemory({ id, organizationId })),
		...additions.map((addition) =>
			createMemory({
				content: addition.content,
				organizationId,
				source: "chat",
				sourceChatId: chatId,
				title: addition.title,
			})
		),
	]);
};

// =============================================================================
// Working memory (token-budgeted live window + compaction blocks + recall)
// =============================================================================

const COMPACT_TRIGGER_TOKENS = 12_000;
const COMPACT_SPAN_FRACTION = 0.5;
const KEEP_RECENT_MESSAGES = 4;
const DEFAULT_BLOCK_SEARCH_TOP_K = 3;

export type CompactableMessage = { id: string; role: string; parts: TextualPart[] };

/**
 * Splits the live window into the span to compact and the remainder. Folds the
 * oldest half of the window in one chunk - every compaction rewrites the prompt
 * prefix and busts provider caching, so it must run rarely and be chunky. The
 * span ends on a turn boundary (the remainder starts with a user message) and
 * always leaves the most recent messages verbatim. Whether compaction is needed
 * at all is decided by the caller from the real prompt token count.
 */
export const selectCompactionSpan = <T extends CompactableMessage>({
	keepRecent = KEEP_RECENT_MESSAGES,
	messages,
	spanFraction = COMPACT_SPAN_FRACTION,
}: {
	keepRecent?: number;
	messages: T[];
	spanFraction?: number;
}) => {
	const maxSpanEnd = Math.max(0, messages.length - keepRecent);
	let spanEnd = Math.min(Math.ceil(messages.length * spanFraction), maxSpanEnd);

	// Never end the span mid-turn: the remainder must start with a user message.
	while (spanEnd < maxSpanEnd && messages[spanEnd]?.role !== "user") {
		spanEnd += 1;
	}

	if (spanEnd === 0 || messages[spanEnd]?.role !== "user") {
		return null;
	}

	return { rest: messages.slice(spanEnd), span: messages.slice(0, spanEnd) };
};

/**
 * Messages after the newest block's boundary - the part of the chat the model
 * sees verbatim. Without blocks, the whole chat is the live window.
 */
export const liveWindowMessages = <T extends { id: string }>({
	blocks,
	messages,
}: {
	blocks: Array<{ lastMessageId: string }>;
	messages: T[];
}) => {
	const lastBlock = blocks.at(-1);

	if (!lastBlock) {
		return messages;
	}

	const boundaryIndex = messages.findIndex((message) => message.id === lastBlock.lastMessageId);

	return boundaryIndex === -1 ? messages : messages.slice(boundaryIndex + 1);
};

export const blockToText = (block: { title: string; summary: string; tags: string[] }) =>
	[block.title, block.summary, block.tags.length > 0 ? `Tags: ${block.tags.join(", ")}` : undefined]
		.filter(Boolean)
		.join("\n");

/**
 * Runs the block-summary prompt over a span of messages and returns the
 * structured summary. Pure (no DB I/O) so it can be exercised directly by evals.
 */
export const generateBlockSummary = async ({
	messages,
	model = models.cheapFast,
}: {
	messages: TextualMessage[];
	model?: ModelConfig;
}) => {
	const transcript = messages
		.map(messageToText)
		.filter((text) => text.trim().length > 0)
		.join("\n");

	const { output } = await generateText({
		...model,
		output: Output.object({
			schema: blockSummarySchema,
		}),
		instructions: blockSummarySystemPrompt,
		prompt: transcript,
	});

	return output;
};

/**
 * Compacts the oldest part of a chat's live window into a titled summary block
 * when the turn's real prompt size (reported by the gateway) exceeds the
 * trigger. Safe to call after every turn; a no-op while the prompt is within
 * budget. Concurrent runs are defused by the (chatId, orderIndex) unique index.
 */
export const compactChatIfNeeded = async ({
	chatId,
	organizationId,
	promptTokens,
}: {
	chatId: string;
	organizationId: string;
	/** Input token count of the turn's final model call, as reported by the gateway. */
	promptTokens: number | undefined;
}) => {
	if (promptTokens === undefined || promptTokens <= COMPACT_TRIGGER_TOKENS) {
		return null;
	}

	const chat = await db.query.aiChats.findFirst({
		where: { id: chatId, organizationId },
		with: {
			blocks: { orderBy: { orderIndex: "asc" } },
			messages: { orderBy: { createdAt: "asc" } },
		},
	});

	if (!chat) {
		return null;
	}

	const selection = selectCompactionSpan({
		messages: liveWindowMessages({ blocks: chat.blocks, messages: chat.messages }),
	});

	if (!selection) {
		return null;
	}

	const firstMessage = selection.span.at(0);
	const lastMessage = selection.span.at(-1);

	if (!firstMessage || !lastMessage) {
		return null;
	}

	// The cheap model occasionally echoes the JSON schema instead of matching it.
	const summary = await generateBlockSummary({ messages: selection.span }).catch((error) => {
		if (!NoObjectGeneratedError.isInstance(error)) {
			throw error;
		}

		return generateBlockSummary({ messages: selection.span, model: models.fast });
	});

	const embedding = await generateRagEmbedding({ value: blockToText(summary) });

	const [block] = await db
		.insert(aiChatBlocks)
		.values({
			chatId,
			embedding,
			firstMessageId: firstMessage.id,
			lastMessageId: lastMessage.id,
			orderIndex: chat.blocks.length,
			organizationId,
			summary: summary.summary,
			tags: summary.tags,
			title: summary.title.slice(0, 200),
		})
		.onConflictDoNothing()
		.returning();

	return block ?? null;
};

/** The verbatim messages a block compacted, for on-demand recall. */
export const getBlockMessages = async ({
	blockId,
	chatId,
	organizationId,
}: {
	blockId: string;
	chatId: string;
	organizationId: string;
}) => {
	const block = await db.query.aiChatBlocks.findFirst({
		where: { id: blockId, chatId, organizationId },
	});

	if (!block) {
		return null;
	}

	const bounds = await db
		.select({ createdAt: aiChatMessages.createdAt, id: aiChatMessages.id })
		.from(aiChatMessages)
		.where(inArray(aiChatMessages.id, [block.firstMessageId, block.lastMessageId]));

	const firstMessage = bounds.find((bound) => bound.id === block.firstMessageId);
	const lastMessage = bounds.find((bound) => bound.id === block.lastMessageId);

	if (!firstMessage || !lastMessage) {
		return { block, messages: [] };
	}

	const rows = await db
		.select()
		.from(aiChatMessages)
		.where(
			and(
				eq(aiChatMessages.chatId, chatId),
				gte(aiChatMessages.createdAt, firstMessage.createdAt),
				lte(aiChatMessages.createdAt, lastMessage.createdAt)
			)
		)
		.orderBy(asc(aiChatMessages.createdAt));

	return { block, messages: rows };
};

/** Semantic search over a chat's block summaries, for query-based recall. */
export const searchChatBlocks = async ({
	chatId,
	organizationId,
	query,
	topK = DEFAULT_BLOCK_SEARCH_TOP_K,
}: {
	chatId: string;
	organizationId: string;
	query: string;
	topK?: number;
}) => {
	if (!query.trim()) {
		return [];
	}

	const queryEmbedding = await generateRagEmbedding({ value: query });
	const similarity = sql<number>`1 - (${cosineDistance(aiChatBlocks.embedding, queryEmbedding)})`;

	const rows = await db
		.select({
			id: aiChatBlocks.id,
			similarity,
			summary: aiChatBlocks.summary,
			tags: aiChatBlocks.tags,
			title: aiChatBlocks.title,
		})
		.from(aiChatBlocks)
		.where(and(eq(aiChatBlocks.chatId, chatId), eq(aiChatBlocks.organizationId, organizationId)))
		.orderBy((row) => desc(row.similarity))
		.limit(topK);

	return rows.map(({ similarity: score, ...block }) => ({ block, similarity: Number(score) }));
};

// =============================================================================
// Episodic memory (per-chat reflections + related-chat recall)
// =============================================================================

/**
 * Runs the chat-reflection prompt over a conversation and returns the structured
 * reflection. Pure (no DB I/O) so it can be exercised directly by evals.
 */
export const generateChatReflection = async ({
	chat,
	model = models.cheapFast,
}: {
	chat: { messages: TextualMessage[]; title: string };
	model?: ModelConfig;
}) => {
	const { output } = await generateText({
		...model,
		output: Output.object({
			schema: chatReflectionSchema,
		}),
		instructions: chatReflectionSystemPrompt,
		prompt: chatToText(chat),
	});

	return output;
};

/**
 * Generates a structured reflection on a finished chat and stores it as an
 * episode that future conversations can recall.
 */
export const reflectOnChat = async ({ chatId, organizationId }: { chatId: string; organizationId: string }) => {
	const chat = await db.query.aiChats.findFirst({
		where: { id: chatId, organizationId },
		with: { messages: { orderBy: { createdAt: "asc" } } },
	});

	if (!chat || chat.messages.length === 0) {
		return;
	}

	// The cheap model occasionally echoes the JSON schema instead of matching it.
	const output = await generateChatReflection({ chat, model: models.cheapFast }).catch((error) => {
		if (!NoObjectGeneratedError.isInstance(error)) {
			throw error;
		}

		return generateChatReflection({ chat, model: models.fast });
	});

	const embedding = await generateRagEmbedding({ value: episodeToText(output) });

	await db
		.insert(chatEpisodes)
		.values({
			chatId,
			embedding,
			organizationId,
			summary: output.summary,
			tags: output.tags,
			whatToAvoid: output.whatToAvoid,
			whatWorkedWell: output.whatWorkedWell,
		})
		.onConflictDoUpdate({
			target: chatEpisodes.chatId,
			set: {
				embedding,
				summary: output.summary,
				tags: output.tags,
				updatedAt: new Date().toISOString(),
				whatToAvoid: output.whatToAvoid,
				whatWorkedWell: output.whatWorkedWell,
			},
		});
};

export const searchRelatedChats = async ({
	currentChatId,
	messages,
	organizationId,
	queryEmbedding: providedEmbedding,
	topK = DEFAULT_RELATED_CHATS_TOP_K,
}: {
	currentChatId: string;
	messages: TextualMessage[];
	organizationId: string;
	/** Precomputed embedding of the message-history query, to avoid re-embedding when callers fan out. */
	queryEmbedding?: number[];
	topK?: number;
}) => {
	const query = messageHistoryToQuery(messages);

	if (!query.trim()) {
		return [];
	}

	const queryEmbedding = providedEmbedding ?? (await generateRagEmbedding({ value: query }));
	const similarity = sql<number>`1 - (${cosineDistance(chatEpisodes.embedding, queryEmbedding)})`;

	const rows = await db
		.select({
			summary: chatEpisodes.summary,
			tags: chatEpisodes.tags,
			similarity,
			whatToAvoid: chatEpisodes.whatToAvoid,
			whatWorkedWell: chatEpisodes.whatWorkedWell,
		})
		.from(chatEpisodes)
		.where(and(eq(chatEpisodes.organizationId, organizationId), ne(chatEpisodes.chatId, currentChatId)))
		.orderBy((row) => desc(row.similarity))
		.limit(topK);

	return rows.map(({ similarity: score, ...episode }) => ({ episode, similarity: Number(score) }));
};
