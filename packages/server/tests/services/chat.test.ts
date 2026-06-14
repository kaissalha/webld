import { v4 as uuidv4 } from "uuid";
import { afterEach, describe, expect, it } from "vitest";

import type { BaseChatUIMessage } from "../../src/ai/types";
import {
	cancelStream,
	createStreamId,
	deleteChat,
	getChat,
	getChatMessagesFromDb,
	getChats,
	getStream,
	getStreamIdsByChatId,
	saveChat,
	saveOrUpdateChatMessage,
	updateChatTitle,
} from "../../src/services/chat";
import { cleanupOrganization, createTestOrganization } from "../helpers/db";

describe("chat service", () => {
	const organizationIds: string[] = [];

	afterEach(async () => {
		for (const id of organizationIds) {
			await cleanupOrganization(id);
		}
		organizationIds.length = 0;
	});

	const createTrackedOrganization = async () => {
		const org = await createTestOrganization();
		organizationIds.push(org.id);
		return org;
	};

	it("creates and fetches chats", async () => {
		const organization = await createTrackedOrganization();
		const chatId = uuidv4();

		await saveChat({ id: chatId, organizationId: organization.id, title: "Chat 1" });

		const chat = await getChat(chatId, organization.id);
		expect(chat?.title).toBe("Chat 1");

		const chats = await getChats(organization.id);
		expect(chats.chats.length).toBeGreaterThan(0);
	});

	it("saves and retrieves chat messages", async () => {
		const organization = await createTrackedOrganization();
		const chatId = uuidv4();
		await saveChat({ id: chatId, organizationId: organization.id, title: "Chat 1" });

		const message: BaseChatUIMessage = {
			id: uuidv4(),
			role: "assistant",
			parts: [{ type: "text", text: "Hello" }],
		} as BaseChatUIMessage;

		await saveOrUpdateChatMessage(chatId, message);

		const messages = await getChatMessagesFromDb({ chatId, organizationId: organization.id });
		expect(messages.length).toBe(1);
	});

	it("creates and lists stream IDs", async () => {
		const organization = await createTrackedOrganization();
		const chatId = uuidv4();
		await saveChat({ id: chatId, organizationId: organization.id, title: "Chat 1" });

		const streamId = uuidv4();
		await createStreamId({ streamId, chatId });

		const streamIds = await getStreamIdsByChatId({ chatId });
		expect(streamIds).toContain(streamId);
	});

	it("updates chat titles", async () => {
		const organization = await createTrackedOrganization();
		const chatId = uuidv4();
		await saveChat({ id: chatId, organizationId: organization.id, title: "Original title" });

		await updateChatTitle({
			chatId,
			organizationId: organization.id,
			title: "Updated title",
		});

		const chat = await getChat(chatId, organization.id);
		expect(chat?.title).toBe("Updated title");
	});

	it("marks streams as canceled", async () => {
		const organization = await createTrackedOrganization();
		const chatId = uuidv4();
		await saveChat({ id: chatId, organizationId: organization.id, title: "Chat 1" });

		const streamId = uuidv4();
		await createStreamId({ streamId, chatId });
		await cancelStream({ streamId });

		const stream = await getStream({ streamId });
		expect(stream?.canceledAt).toBeTruthy();
	});

	it("throws when deleting missing chat", async () => {
		const organization = await createTrackedOrganization();

		await expect(deleteChat(uuidv4(), organization.id)).rejects.toThrow("Chat not found");
	});
});
