import { convertToModelMessages, generateObject } from "ai";
import { and, cosineDistance, desc, eq, isNotNull, ne, notInArray, sql } from "drizzle-orm";

import { models } from "@webld/ai/models";
import {
	chatReflectionSchema,
	chatReflectionSystemPrompt,
	memoryExtractionSchema,
	memoryExtractionSystemPrompt,
} from "@webld/ai/prompts";
import { aiChatMessages, aiChats, type ChatEpisode, chatEpisodes, db, type Memory, memories } from "@webld/db";

import type { BaseChatUIMessage } from "../ai/types";
import { generateRagEmbedding } from "./rag";

const DEFAULT_MEMORY_TOP_K = 3;
const DEFAULT_OLD_MESSAGE_TOP_K = 10;
const DEFAULT_RELATED_CHATS_TOP_K = 3;

type TextualPart = { type: string; [key: string]: unknown };
type TextualMessage = { role: string; parts: TextualPart[] };

// =============================================================================
// Text utilities
// =============================================================================

const partToText = (part: TextualPart) =>
	part.type === "text" && typeof part.text === "string" ? part.text : undefined;

export const messagePartsToText = (parts: TextualPart[]) =>
	parts
		.map(partToText)
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

export const searchMemories = async ({
	messages,
	organizationId,
	topK = DEFAULT_MEMORY_TOP_K,
}: {
	messages: TextualMessage[];
	organizationId: string;
	topK?: number;
}) => {
	const query = messageHistoryToQuery(messages);

	if (!query.trim()) {
		return [];
	}

	const queryEmbedding = await generateRagEmbedding({ value: query });
	const similarity = sql<number>`1 - (${cosineDistance(memories.embedding, queryEmbedding)})`;

	const rows = await db
		.select({
			content: memories.content,
			id: memories.id,
			similarity,
			source: memories.source,
			title: memories.title,
		})
		.from(memories)
		.where(eq(memories.organizationId, organizationId))
		.orderBy((row) => desc(row.similarity))
		.limit(topK);

	return rows.map(({ similarity: score, ...memory }) => ({ memory, similarity: Number(score) }));
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
	const filteredMessages = messages.filter((message) => message.role === "user" || message.role === "assistant");

	if (filteredMessages.length === 0) {
		return;
	}

	const existingMemories = await loadMemories({ organizationId });

	const { object } = await generateObject({
		model: models.fast.model,
		schema: memoryExtractionSchema,
		instructions: memoryExtractionSystemPrompt({
			memories: existingMemories.map((memory) => ({ id: memory.id, text: memoryToText(memory) })),
		}),
		messages: await convertToModelMessages(filteredMessages),
	});

	const { additions, deletions, updates } = object;
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
// Working memory (per-message embeddings + semantic recall of older messages)
// =============================================================================

export const embedChatMessage = async ({ message }: { message: { id: string; parts: TextualPart[] } }) => {
	const text = messagePartsToText(message.parts).trim();

	if (!text) {
		return;
	}

	const embedding = await generateRagEmbedding({ value: text });

	await db.update(aiChatMessages).set({ embedding }).where(eq(aiChatMessages.id, message.id));
};

/**
 * Finds older messages in the same chat that are semantically relevant to the
 * recent window, so long conversations can stay within the context budget.
 */
export const searchOlderMessages = async ({
	chatId,
	excludeMessageIds = [],
	organizationId,
	recentMessages,
	topK = DEFAULT_OLD_MESSAGE_TOP_K,
}: {
	chatId: string;
	excludeMessageIds?: string[];
	organizationId: string;
	recentMessages: TextualMessage[];
	topK?: number;
}) => {
	const query = messageHistoryToQuery(recentMessages);

	if (!query.trim()) {
		return [];
	}

	const queryEmbedding = await generateRagEmbedding({ value: query });
	const similarity = sql<number>`1 - (${cosineDistance(aiChatMessages.embedding, queryEmbedding)})`;

	const conditions = [
		eq(aiChatMessages.chatId, chatId),
		eq(aiChats.organizationId, organizationId),
		isNotNull(aiChatMessages.embedding),
	];

	if (excludeMessageIds.length > 0) {
		conditions.push(notInArray(aiChatMessages.id, excludeMessageIds));
	}

	const rows = await db
		.select({ id: aiChatMessages.id, similarity })
		.from(aiChatMessages)
		.innerJoin(aiChats, eq(aiChatMessages.chatId, aiChats.id))
		.where(and(...conditions))
		.orderBy((row) => desc(row.similarity))
		.limit(topK);

	return rows.map((row) => ({ id: row.id, similarity: Number(row.similarity) }));
};

// =============================================================================
// Episodic memory (per-chat reflections + related-chat recall)
// =============================================================================

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

	const { object } = await generateObject({
		model: models.fast.model,
		schema: chatReflectionSchema,
		instructions: chatReflectionSystemPrompt,
		prompt: chatToText({ messages: chat.messages, title: chat.title }),
	});

	const embedding = await generateRagEmbedding({ value: episodeToText(object) });

	await db
		.insert(chatEpisodes)
		.values({
			chatId,
			embedding,
			organizationId,
			summary: object.summary,
			tags: object.tags,
			whatToAvoid: object.whatToAvoid,
			whatWorkedWell: object.whatWorkedWell,
		})
		.onConflictDoUpdate({
			target: chatEpisodes.chatId,
			set: {
				embedding,
				summary: object.summary,
				tags: object.tags,
				updatedAt: new Date().toISOString(),
				whatToAvoid: object.whatToAvoid,
				whatWorkedWell: object.whatWorkedWell,
			},
		});
};

export const searchRelatedChats = async ({
	currentChatId,
	messages,
	organizationId,
	topK = DEFAULT_RELATED_CHATS_TOP_K,
}: {
	currentChatId: string;
	messages: TextualMessage[];
	organizationId: string;
	topK?: number;
}) => {
	const query = messageHistoryToQuery(messages);

	if (!query.trim()) {
		return [];
	}

	const queryEmbedding = await generateRagEmbedding({ value: query });
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
