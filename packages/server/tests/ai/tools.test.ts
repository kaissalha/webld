import { beforeEach, describe, expect, it, vi } from "vitest";

const { createContact, createRagChunkSnippet, getContact, listContacts, retrieveRagChunks } = vi.hoisted(() => ({
	createContact: vi.fn(),
	createRagChunkSnippet: vi.fn(),
	getContact: vi.fn(),
	listContacts: vi.fn(),
	retrieveRagChunks: vi.fn(),
}));

vi.mock("../../src/services/contacts", () => ({
	createContact,
	getContact,
	listContacts,
}));

vi.mock("../../src/services/rag", () => ({
	createRagChunkSnippet,
	retrieveRagChunks,
}));

import type { ModelMessage, ToolExecuteFunction, ToolExecutionOptions } from "ai";

import { composeEmailTool } from "../../src/ai/tools/compose-email";
import { createContactTool } from "../../src/ai/tools/create-contact";
import { getContactTool } from "../../src/ai/tools/get-contact";
import { getContactsTool } from "../../src/ai/tools/get-contacts";
import { retrieveKnowledgeTool } from "../../src/ai/tools/retrieve-knowledge";
import type { AppContext } from "../../src/ai/types";

const collect = async <T>(generator: AsyncIterable<T>) => {
	const outputs: T[] = [];
	for await (const output of generator) {
		outputs.push(output);
	}
	return outputs;
};

const runTool = async <TInput, TOutput, TContext extends AppContext>(
	execute: ToolExecuteFunction<TInput, TOutput, TContext> | undefined,
	input: TInput,
	context: TContext
) => {
	if (!execute) {
		throw new Error("Tool execute handler is missing");
	}

	const options: ToolExecutionOptions<TContext> = {
		context,
		toolCallId: "tool-call",
		messages: [] as ModelMessage[],
	};

	const result = execute(input, options);

	if (result && typeof (result as AsyncIterable<TOutput>)[Symbol.asyncIterator] === "function") {
		return collect(result as AsyncIterable<TOutput>);
	}

	return [await result];
};

describe("ai tools", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("getContactsTool returns error without organization", async () => {
		const outputs = await runTool(getContactsTool.execute, { search: "test", pageSize: 1 }, {});

		expect(outputs[1]).toEqual({ status: "error", error: "Organization context not found" });
	});

	it("getContactsTool returns contacts on success", async () => {
		listContacts.mockResolvedValue({
			data: [
				{
					createdAt: "2026-05-01T10:00:00.000Z",
					email: "sam@example.com",
					firstName: "Sam",
					id: "contact-1",
					lastName: "Test",
					phoneNumber: null,
				},
			],
			meta: { cursor: null, totalData: 1 },
		});

		const outputs = await runTool(
			getContactsTool.execute,
			{ search: "sam", pageSize: 1 },
			{ organizationId: "org-1" }
		);

		expect(outputs.at(-1)).toEqual(
			expect.objectContaining({
				contacts: expect.arrayContaining([expect.objectContaining({ id: "contact-1" })]),
				hasMore: false,
				status: "success",
				totalCount: 1,
			})
		);
	});

	it("getContactTool returns error when contact is missing", async () => {
		getContact.mockResolvedValue(null);

		const outputs = await runTool(getContactTool.execute, { contactId: "contact-1" }, { organizationId: "org-1" });

		expect(outputs.at(-1)).toEqual({ status: "error", error: "Contact not found" });
	});

	it("createContactTool returns success", async () => {
		createContact.mockResolvedValue({
			createdAt: "2026-05-01T10:00:00.000Z",
			email: "sam@example.com",
			firstName: "Sam",
			id: "contact-1",
			lastName: "Test",
			phoneNumber: null,
		});

		const outputs = await runTool(
			createContactTool.execute,
			{ firstName: "Sam", lastName: "Test", email: "sam@example.com" },
			{ organizationId: "org-1" }
		);

		expect(outputs.at(-1)).toEqual(
			expect.objectContaining({
				contact: expect.objectContaining({ id: "contact-1" }),
				status: "success",
			})
		);
	});

	it("retrieveKnowledgeTool returns ranked snippets", async () => {
		retrieveRagChunks.mockResolvedValue([
			{
				chunkId: "chunk-1",
				chunkIndex: 0,
				content: "Use concise follow-up summaries after demos.",
				document: {
					id: "doc-1",
					name: "Sales playbook",
					source: null,
					sourceType: "text",
				},
				metadata: {},
				similarity: 0.82,
			},
		]);
		createRagChunkSnippet.mockReturnValue("Use concise follow-up summaries after demos.");

		const outputs = await runTool(
			retrieveKnowledgeTool.execute,
			{ searchQuery: "follow-up summaries", topK: 5 },
			{ organizationId: "org-1" }
		);

		expect(outputs.at(-1)).toEqual(
			expect.objectContaining({
				found: true,
				results: expect.arrayContaining([
					expect.objectContaining({
						chunkId: "chunk-1",
						snippet: "Use concise follow-up summaries after demos.",
					}),
				]),
				status: "success",
			})
		);
	});

	it("composeEmailTool uses the current user's name from context", async () => {
		const outputs = await runTool(
			composeEmailTool.execute,
			{
				content: "Best,\n[Your Name]",
				title: "Follow-up",
				to: "lead@example.com",
			},
			{
				currentUser: {
					email: "owner@example.com",
					name: "Alex Rivera",
				},
				organizationId: "org-1",
			}
		);

		expect(outputs.at(-1)).toEqual({
			address: "lead@example.com",
			content: "Best,\nAlex Rivera",
			title: "Follow-up",
		});
	});
});
