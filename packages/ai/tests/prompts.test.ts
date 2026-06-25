import { describe, expect, it } from "vitest";

import {
	dashboardChatSystemPrompt,
	dashboardChatTitlePrompt,
	memoryExtractionSchema,
	ragAnswerSystemPrompt,
} from "../src/prompts";

describe("prompts", () => {
	it("adds a trimmed current user section when user details are provided", () => {
		const prompt = dashboardChatSystemPrompt({
			currentUser: {
				email: "  owner@example.com ",
				name: "  Alex Rivera ",
			},
		});

		expect(prompt).toContain("## Current User");
		expect(prompt).toContain("- Name: Alex Rivera");
		expect(prompt).toContain("- Email: owner@example.com");
		expect(prompt).toContain("Never use placeholders like [Your Name].");
	});

	it("omits the current user section when there is no usable user information", () => {
		const prompt = dashboardChatSystemPrompt({
			currentUser: {
				email: "   ",
				name: "   ",
			},
		});

		expect(prompt).not.toContain("## Current User");
	});

	it("builds the dashboard chat title prompt around the user message", () => {
		const prompt = dashboardChatTitlePrompt({
			message: "Find contacts from Acme and draft a follow-up",
		});

		expect(prompt).toContain("Find contacts from Acme and draft a follow-up");
		expect(prompt).toContain("- 2 to 6 words");
	});

	it("keeps RAG instructions in the AI package", () => {
		const prompt = dashboardChatSystemPrompt();

		expect(prompt).toContain("retrieveKnowledge");
		expect(prompt).toContain("getKnowledgeContent");
		expect(ragAnswerSystemPrompt).toContain("retrieveKnowledge");
		expect(ragAnswerSystemPrompt).toContain("cite sources");
	});

	it("unwraps JSON Schema-shaped memory extraction output", () => {
		const parsed = memoryExtractionSchema.parse({
			type: "object",
			properties: {
				updates: [],
				deletions: [],
				additions: [{ title: "Preferred tone", content: "Concise bullet points" }],
			},
		});

		expect(parsed).toEqual({
			updates: [],
			deletions: [],
			additions: [{ title: "Preferred tone", content: "Concise bullet points" }],
		});
	});
});
