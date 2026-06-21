import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";

import { aiChatMessages, aiChatStreams, aiChats, type DbChatNewMessage, db } from "@webld/db";

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

export const convertUIMessagesForDB = <TMessage extends BaseChatUIMessage>(
	chatId: string,
	messages: TMessage[]
): DbChatNewMessage[] => {
	return messages.map((message) => ({
		id: message.id,
		chatId,
		role: message.role,
		parts: message.parts,
	}));
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
					parts: message.parts,
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
		throw new TRPCError({ message: "Chat not found", code: "NOT_FOUND" });
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
		throw new TRPCError({ message: "Chat not found", code: "NOT_FOUND" });
	}

	return db.update(aiChats).set({ title, updatedAt: new Date().toISOString() }).where(eq(aiChats.id, chatId));
};

export const createStreamId = async ({ streamId, chatId }: { streamId: string; chatId: string }) => {
	try {
		await db.insert(aiChatStreams).values({ id: streamId, chatId, createdAt: new Date().toISOString() });
	} catch (error) {
		throw new Error("Failed to create stream id", { cause: error });
	}
};

export const getStreamIdsByChatId = async ({ chatId }: { chatId: string }): Promise<string[]> => {
	try {
		const streamIds = await db
			.select({ id: aiChatStreams.id })
			.from(aiChatStreams)
			.where(eq(aiChatStreams.chatId, chatId))
			.orderBy(asc(aiChatStreams.createdAt))
			.execute();

		return streamIds.map(({ id }) => id);
	} catch (error) {
		throw new Error("Failed to get stream ids by chat id", { cause: error });
	}
};

export const getStream = async ({ streamId }: { streamId: string }) => {
	try {
		const [stream] = await db.select().from(aiChatStreams).where(eq(aiChatStreams.id, streamId)).limit(1);

		return stream;
	} catch (error) {
		throw new Error("Failed to get stream", { cause: error });
	}
};

export const cancelStream = async ({ streamId }: { streamId: string }) => {
	try {
		await db
			.update(aiChatStreams)
			.set({ canceledAt: new Date().toISOString() })
			.where(eq(aiChatStreams.id, streamId));
	} catch (error) {
		throw new Error("Failed to cancel stream", { cause: error });
	}
};
