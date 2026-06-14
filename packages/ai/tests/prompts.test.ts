import { describe, expect, it } from "vitest";

import {
	buildMailClassificationPrompt,
	buildMailSearchRewritePrompt,
	dashboardChatSystemPrompt,
	dashboardChatTitlePrompt,
	mailSearchRewriteSchema,
	mailThreadClassificationSchema,
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
		expect(prompt).toContain("indexed organization documents");
		expect(ragAnswerSystemPrompt).toContain("Use retrieveKnowledge");
		expect(ragAnswerSystemPrompt).toContain("cite sources");
	});

	it("builds the mail search rewrite prompt and schema in the AI package", () => {
		const prompt = buildMailSearchRewritePrompt({
			localDate: "2026-04-23",
			search: "flight not marketing",
		});

		expect(prompt).toContain("Current local date: 2026-04-23");
		expect(prompt).toContain("flight -label:marketing");
		expect(prompt).toContain("flight not marketing");
		expect(mailSearchRewriteSchema.parse({ query: "flight -label:marketing" })).toEqual({
			query: "flight -label:marketing",
		});
	});

	it("builds and validates the mail classification prompt in the AI package", () => {
		const labels: ["to respond", "marketing"] = ["to respond", "marketing"];
		const schema = mailThreadClassificationSchema({
			labels,
			threadIds: ["thread-1"],
		});
		const prompt = buildMailClassificationPrompt({
			connectionEmail: "owner@example.com",
			labelDefinitions: [
				{
					description: "Needs a human reply.",
					label: "to respond",
				},
				{
					description: "Promotional or newsletter-like.",
					label: "marketing",
				},
			],
			threads: [
				{
					id: "thread-1",
					sender: {
						email: "sender@example.com",
						name: "Sender",
					},
					snippet: "Can you reply today?",
					subject: "Follow-up",
				},
			],
		});

		expect(prompt).toContain("You classify Gmail threads for owner@example.com.");
		expect(prompt).toContain("threadId: thread-1");
		expect(prompt).toContain("- marketing: Promotional or newsletter-like.");
		expect(
			schema.parse({
				classifications: [
					{
						label: "to respond",
						threadId: "thread-1",
					},
				],
			})
		).toEqual({
			classifications: [
				{
					label: "to respond",
					threadId: "thread-1",
				},
			],
		});
		expect(() =>
			schema.parse({
				classifications: [
					{
						label: "marketing",
						threadId: "unexpected-thread",
					},
				],
			})
		).toThrow(/Unexpected threadId/);
	});
});
