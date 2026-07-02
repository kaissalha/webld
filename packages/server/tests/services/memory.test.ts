import { v4 as uuidv4 } from "uuid";
import { afterEach, describe, expect, it } from "vitest";

import { aiChatBlocks, db } from "@webld/db";

import type { BaseChatUIMessage } from "../../src/ai/types";
import { saveChat, saveOrUpdateChatMessage } from "../../src/services/chat";
import {
	blockToText,
	type CompactableMessage,
	getBlockMessages,
	liveWindowMessages,
	selectCompactionSpan,
} from "../../src/services/memory";
import { cleanupOrganization, createTestOrganization } from "../helpers/db";

const message = (role: string, text = "hello"): CompactableMessage => ({
	id: uuidv4(),
	role,
	parts: [{ type: "text", text }],
});

describe("selectCompactionSpan", () => {
	it("folds the oldest half of the window, ending on a turn boundary", () => {
		const messages = [
			message("user"),
			message("assistant"),
			message("user"),
			message("assistant"),
			message("user"),
			message("assistant"),
			message("user"),
			message("assistant"),
		];

		const selection = selectCompactionSpan({ messages });

		expect(selection).not.toBeNull();
		expect(selection?.span.length).toBe(4);
		expect(selection?.rest[0]?.role).toBe("user");
		expect([...(selection?.span ?? []), ...(selection?.rest ?? [])].map((m) => m.id)).toEqual(
			messages.map((m) => m.id)
		);
	});

	it("extends the span forward past assistant messages to the next user turn", () => {
		const messages = [
			message("user"),
			message("assistant"),
			message("assistant"),
			message("assistant"),
			message("assistant"),
			message("user"),
			message("assistant"),
			message("user"),
			message("assistant"),
			message("user"),
		];

		const selection = selectCompactionSpan({ messages });

		expect(selection?.span.length).toBe(5);
		expect(selection?.rest[0]?.role).toBe("user");
	});

	it("always leaves the most recent messages verbatim", () => {
		const messages = [message("user"), message("assistant"), message("user"), message("assistant")];

		// With keepRecent = 4 nothing can be folded from a 4-message window.
		expect(selectCompactionSpan({ messages })).toBeNull();
	});

	it("returns null when no user turn boundary exists in range", () => {
		const messages = [
			message("assistant"),
			message("assistant"),
			message("assistant"),
			message("assistant"),
			message("assistant"),
			message("assistant"),
		];

		expect(selectCompactionSpan({ messages })).toBeNull();
	});
});

describe("liveWindowMessages", () => {
	const messages = [message("user"), message("assistant"), message("user"), message("assistant")];

	it("returns all messages when there are no blocks", () => {
		expect(liveWindowMessages({ blocks: [], messages })).toEqual(messages);
	});

	it("returns messages after the newest block boundary", () => {
		const blocks = [{ lastMessageId: messages[1]!.id }];

		expect(liveWindowMessages({ blocks, messages })).toEqual(messages.slice(2));
	});

	it("falls back to all messages when the boundary id is unknown", () => {
		const blocks = [{ lastMessageId: uuidv4() }];

		expect(liveWindowMessages({ blocks, messages })).toEqual(messages);
	});
});

describe("blockToText", () => {
	it("joins title, summary, and tags", () => {
		expect(blockToText({ title: "Acme renewal", summary: "Agreed 12% discount", tags: ["acme", "pricing"] })).toBe(
			"Acme renewal\nAgreed 12% discount\nTags: acme, pricing"
		);
	});

	it("omits the tags line when there are none", () => {
		expect(blockToText({ title: "Acme renewal", summary: "Agreed 12% discount", tags: [] })).toBe(
			"Acme renewal\nAgreed 12% discount"
		);
	});
});

describe("getBlockMessages", () => {
	const organizationIds: string[] = [];

	afterEach(async () => {
		for (const id of organizationIds) {
			await cleanupOrganization(id);
		}
		organizationIds.length = 0;
	});

	it("returns the verbatim messages a block compacted, in order", async () => {
		const organization = await createTestOrganization();
		organizationIds.push(organization.id);

		const chatId = uuidv4();
		await saveChat({ id: chatId, organizationId: organization.id, title: "Chat" });

		const savedMessages: BaseChatUIMessage[] = [];

		for (const [index, role] of (["user", "assistant", "user", "assistant"] as const).entries()) {
			const chatMessage = {
				id: uuidv4(),
				role,
				parts: [{ type: "text", text: `message ${index}` }],
			} as BaseChatUIMessage;

			await saveOrUpdateChatMessage(chatId, chatMessage);
			savedMessages.push(chatMessage);
		}

		const [block] = await db
			.insert(aiChatBlocks)
			.values({
				chatId,
				embedding: new Array(1536).fill(0),
				firstMessageId: savedMessages[0]!.id,
				lastMessageId: savedMessages[1]!.id,
				orderIndex: 0,
				organizationId: organization.id,
				summary: "First exchange",
				tags: [],
				title: "Opening",
			})
			.returning();

		const result = await getBlockMessages({
			blockId: block!.id,
			chatId,
			organizationId: organization.id,
		});

		expect(result?.block.title).toBe("Opening");
		expect(result?.messages.map((row) => row.id)).toEqual([savedMessages[0]!.id, savedMessages[1]!.id]);
	});

	it("returns null for a block from another chat", async () => {
		const organization = await createTestOrganization();
		organizationIds.push(organization.id);

		const result = await getBlockMessages({
			blockId: uuidv4(),
			chatId: uuidv4(),
			organizationId: organization.id,
		});

		expect(result).toBeNull();
	});
});
