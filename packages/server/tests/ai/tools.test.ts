import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	createContact,
	formatRagChunksForContext,
	getContact,
	listAllCalendarEvents,
	listContacts,
	listMailThreads,
	readInitialMailThreadListPage,
	retrieveRagChunks,
} = vi.hoisted(() => ({
	createContact: vi.fn(),
	formatRagChunksForContext: vi.fn(),
	getContact: vi.fn(),
	listAllCalendarEvents: vi.fn(),
	listContacts: vi.fn(),
	listMailThreads: vi.fn(),
	readInitialMailThreadListPage: vi.fn(),
	retrieveRagChunks: vi.fn(),
}));

vi.mock("../../src/services/contacts", () => ({
	createContact,
	getContact,
	listContacts,
}));

vi.mock("../../src/services/google-calendar", () => ({
	listAllCalendarEvents,
}));

vi.mock("../../src/services/mail", () => ({
	listMailThreads,
	readInitialMailThreadListPage,
}));

vi.mock("../../src/services/rag", () => ({
	formatRagChunksForContext,
	retrieveRagChunks,
}));

import type { ModelMessage, ToolExecuteFunction, ToolExecutionOptions } from "ai";

import { composeEmailTool } from "../../src/ai/tools/compose-email";
import { createContactTool } from "../../src/ai/tools/create-contact";
import { getContactTool } from "../../src/ai/tools/get-contact";
import { getContactsTool } from "../../src/ai/tools/get-contacts";
import { listCalendarEventsTool } from "../../src/ai/tools/list-calendar-events";
import { retrieveKnowledgeTool } from "../../src/ai/tools/retrieve-knowledge";
import { searchMailThreadsTool } from "../../src/ai/tools/search-mail-threads";

const collect = async <T>(generator: AsyncIterable<T>) => {
	const outputs: T[] = [];
	for await (const output of generator) {
		outputs.push(output);
	}
	return outputs;
};

const runTool = async <TInput, TOutput>(
	execute: ToolExecuteFunction<TInput, TOutput> | undefined,
	input: TInput,
	experimentalContext: unknown
) => {
	if (!execute) {
		throw new Error("Tool execute handler is missing");
	}

	const options: ToolExecutionOptions = {
		toolCallId: "tool-call",
		messages: [] as ModelMessage[],
		experimental_context: experimentalContext,
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

	it("searchMailThreadsTool returns Gmail threads", async () => {
		listMailThreads.mockReturnValue("mail-stream");
		readInitialMailThreadListPage.mockResolvedValue({
			connectionEmail: "owner@example.com",
			threads: [
				{
					id: "thread-1",
					isStarred: false,
					isUnread: true,
					labelIds: [],
					receivedOn: "2026-05-01T10:00:00.000Z",
					sender: { email: "lead@example.com", name: "Sam Test" },
					snippet: "Checking in",
					subject: "Follow-up",
				},
			],
		});

		const outputs = await runTool(
			searchMailThreadsTool.execute,
			{ folder: "inbox", maxResults: 10, query: "lead@example.com" },
			{ organizationId: "org-1" }
		);

		expect(outputs.at(-1)).toEqual(
			expect.objectContaining({
				connectionEmail: "owner@example.com",
				status: "success",
				threads: expect.arrayContaining([expect.objectContaining({ id: "thread-1" })]),
				totalCount: 1,
			})
		);
		expect(readInitialMailThreadListPage).toHaveBeenCalledWith({ stream: "mail-stream" });
	});

	it("listCalendarEventsTool returns upcoming events", async () => {
		listAllCalendarEvents.mockResolvedValue({
			calendars: [],
			connectionId: "connection-1",
			events: [
				{
					calendarId: "primary",
					calendarName: "Primary",
					created: "2026-05-01T10:00:00.000Z",
					end: { dateTime: "2026-05-02T11:00:00.000Z" },
					htmlLink: "https://calendar.google.com/event?eid=1",
					id: "event-1",
					location: "Office",
					start: { dateTime: "2026-05-02T10:00:00.000Z" },
					status: "confirmed",
					summary: "Customer follow-up",
				},
			],
		});

		const outputs = await runTool(
			listCalendarEventsTool.execute,
			{ daysAhead: 7, maxResults: 10 },
			{ organizationId: "org-1" }
		);

		expect(outputs.at(-1)).toEqual(
			expect.objectContaining({
				events: expect.arrayContaining([expect.objectContaining({ id: "event-1" })]),
				status: "success",
				totalCount: 1,
			})
		);
	});

	it("retrieveKnowledgeTool returns indexed context", async () => {
		retrieveRagChunks.mockResolvedValue([
			{
				content: "Use concise follow-up notes after demos.",
				document: {
					id: "doc-1",
					name: "Sales playbook",
					source: null,
					sourceType: "text",
				},
				similarity: 0.82,
			},
		]);
		formatRagChunksForContext.mockReturnValue("[1] Use concise follow-up notes after demos.");

		const outputs = await runTool(
			retrieveKnowledgeTool.execute,
			{ query: "follow-up notes", similarityThreshold: 0.4, topK: 5 },
			{ organizationId: "org-1" }
		);

		expect(outputs.at(-1)).toEqual(
			expect.objectContaining({
				context: "[1] Use concise follow-up notes after demos.",
				found: true,
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
