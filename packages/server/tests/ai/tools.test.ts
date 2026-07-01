import { beforeEach, describe, expect, it, vi } from "vitest";

const { createFileChunkSnippet, retrieveFileChunks } = vi.hoisted(() => ({
	createFileChunkSnippet: vi.fn(),
	retrieveFileChunks: vi.fn(),
}));

vi.mock("../../src/services/rag", () => ({
	createFileChunkSnippet,
	retrieveFileChunks,
}));

import type { ModelMessage, ToolExecuteFunction, ToolExecutionOptions } from "ai";

import { composeEmailTool } from "../../src/ai/tools/compose-email";
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

	it("retrieveKnowledgeTool returns ranked snippets", async () => {
		retrieveFileChunks.mockResolvedValue([
			{
				chunkId: "chunk-1",
				chunkIndex: 0,
				content: "Use concise follow-up summaries after demos.",
				file: {
					id: "doc-1",
					kind: "text",
					name: "Sales playbook",
					source: "https://example.com/sales-playbook",
					title: "Sales playbook",
					url: null,
				},
				metadata: {},
				similarity: 0.82,
			},
		]);
		createFileChunkSnippet.mockReturnValue("Use concise follow-up summaries after demos.");

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
						document: expect.objectContaining({
							source: "https://example.com/sales-playbook",
						}),
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
