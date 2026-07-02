import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import { aiChatMessages, aiChats, type DbChatMessage, type DbChatNewMessage, db } from "@webld/db";

import type { BaseChatUIMessage } from "../ai/types";

export const saveChat = async ({
	id,
	organizationId,
	title,
}: {
	id: string;
	organizationId: string;
	title: string;
}) => {
	try {
		return await db.insert(aiChats).values({
			id,
			organizationId,
			title,
		});
	} catch (error) {
		throw new Error("Failed to save chat", { cause: error });
	}
};

// Postgres json/text columns cannot store the NUL character (code point 0), and
// tool output (e.g. web search results) occasionally contains it, which fails the
// insert with error 22P05. Strip it from every string in the parts before saving.
const stripNullBytes = <T>(value: T): T => {
	if (typeof value === "string") {
		return value.replace(/\u0000/g, "") as T;
	}

	if (Array.isArray(value)) {
		return value.map(stripNullBytes) as T;
	}

	if (value !== null && typeof value === "object") {
		return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, stripNullBytes(val)])) as T;
	}

	return value;
};

export const convertUIMessagesForDB = <TMessage extends BaseChatUIMessage>(
	chatId: string,
	messages: TMessage[]
): DbChatNewMessage[] => {
	return messages.map((message) => ({
		id: message.id,
		chatId,
		role: message.role,
		parts: stripNullBytes(message.parts),
	}));
};

export const convertDbMessagesForUI = <TMessage extends BaseChatUIMessage>(messages: DbChatMessage[]): TMessage[] => {
	return messages.map<TMessage>(
		(message) =>
			({
				id: message.id,
				role: message.role as TMessage["role"],
				parts: message.parts as TMessage["parts"],
				metadata: {
					createdAt: new Date(message.createdAt).toISOString(),
				},
			}) as TMessage
	);
};

export const saveOrUpdateChatMessage = async (chatId: string, message: BaseChatUIMessage) => {
	try {
		const dbMessages = convertUIMessagesForDB(chatId, [message]);

		return await db
			.insert(aiChatMessages)
			.values(dbMessages)
			.onConflictDoUpdate({
				target: aiChatMessages.id,
				set: {
					parts: stripNullBytes(message.parts),
					updatedAt: new Date().toISOString(),
				},
			});
	} catch (error) {
		throw new Error("Failed to save messages", { cause: error });
	}
};

export const getChat = async (id: string, organizationId: string) => {
	try {
		const chat = await db.query.aiChats.findFirst({
			where: {
				id,
				organizationId,
			},
		});

		return chat;
	} catch (error) {
		throw new Error("Failed to get chat", { cause: error });
	}
};

export const getChats = async (organizationId: string) => {
	try {
		const chats = await db.query.aiChats.findMany({
			where: { organizationId },
			orderBy: { updatedAt: "desc" },
		});

		return {
			chats,
		};
	} catch (error) {
		throw new Error("Failed to get chats", { cause: error });
	}
};

export const getChatWithMessages = async ({ chatId, organizationId }: { chatId: string; organizationId: string }) => {
	try {
		const chat = await db.query.aiChats.findFirst({
			where: {
				id: chatId,
				organizationId,
			},
			with: {
				blocks: {
					orderBy: { orderIndex: "asc" },
				},
				messages: {
					orderBy: { createdAt: "asc" },
				},
			},
		});

		return chat ?? null;
	} catch (error) {
		throw new Error("Failed to get chat with messages", { cause: error });
	}
};

export const getChatMessagesFromDb = async ({ chatId, organizationId }: { chatId: string; organizationId: string }) => {
	const chat = await getChatWithMessages({ chatId, organizationId });

	if (!chat) {
		throw new Error("Chat not found or not accessible");
	}

	return chat.messages;
};

export const deleteChat = async (chatId: string, organizationId: string) => {
	const chat = await getChat(chatId, organizationId);

	if (!chat) {
		throw new HTTPException(404, { message: "Chat not found" });
	}

	return db.delete(aiChats).where(eq(aiChats.id, chatId));
};

export const updateChatTitle = async ({
	chatId,
	organizationId,
	title,
}: {
	chatId: string;
	organizationId: string;
	title: string;
}) => {
	const chat = await getChat(chatId, organizationId);

	if (!chat) {
		throw new HTTPException(404, { message: "Chat not found" });
	}

	return db.update(aiChats).set({ title, updatedAt: new Date().toISOString() }).where(eq(aiChats.id, chatId));
};

// Records the latest resumable-stream id on the chat. A new stream supersedes any prior
// one, so callers polling getLastStreamId see their stream is no longer current.
export const setLastStreamId = async ({ streamId, chatId }: { streamId: string; chatId: string }) => {
	try {
		await db.update(aiChats).set({ lastStreamId: streamId }).where(eq(aiChats.id, chatId));
	} catch (error) {
		throw new Error("Failed to set last stream id", { cause: error });
	}
};

export const getLastStreamId = async ({ chatId }: { chatId: string }): Promise<string | null> => {
	try {
		const [chat] = await db
			.select({ lastStreamId: aiChats.lastStreamId })
			.from(aiChats)
			.where(eq(aiChats.id, chatId))
			.limit(1);

		return chat?.lastStreamId ?? null;
	} catch (error) {
		throw new Error("Failed to get last stream id", { cause: error });
	}
};

// Cancels the active stream by clearing it. The running stream's poll detects that
// getLastStreamId no longer matches its own id and aborts.
export const cancelStream = async ({ chatId }: { chatId: string }) => {
	try {
		await db.update(aiChats).set({ lastStreamId: null }).where(eq(aiChats.id, chatId));
	} catch (error) {
		throw new Error("Failed to cancel stream", { cause: error });
	}
};
