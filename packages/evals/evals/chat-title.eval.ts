import { Output, generateText } from "ai";
import { createScorer, evalite } from "evalite";

import { models } from "@webld/ai/models";
import { dashboardChatTitlePrompt, dashboardChatTitleSchema } from "@webld/ai/prompts";

import { countWords, scoreKeywordGroups } from "./utils";

type ChatTitleInput = {
	message: string;
};

type ChatTitleExpected = {
	keywordGroups: string[][];
};

const wordBudgetScorer = createScorer<ChatTitleInput, string, ChatTitleExpected>({
	name: "2-6 word title",
	scorer: ({ output }) => {
		const wordCount = countWords(output);
		return wordCount >= 2 && wordCount <= 6 ? 1 : 0;
	},
});

const noQuotesScorer = createScorer<ChatTitleInput, string, ChatTitleExpected>({
	name: "No quotation marks",
	scorer: ({ output }) => (/['"]/u.test(output) ? 0 : 1),
});

const noTrailingPunctuationScorer = createScorer<ChatTitleInput, string, ChatTitleExpected>({
	name: "No trailing punctuation",
	scorer: ({ output }) => (/[\s.!?,;:]$/u.test(output.trim()) ? 0 : 1),
});

const keywordCoverageScorer = createScorer<ChatTitleInput, string, ChatTitleExpected>({
	name: "Matches request intent",
	scorer: ({ output, expected }) => scoreKeywordGroups({ text: output, keywordGroups: expected.keywordGroups }),
});

evalite<ChatTitleInput, string, ChatTitleExpected>("Dashboard chat title prompt", {
	data: [
		{
			input: {
				message: "Can you summarize Maya's recent inbox thread and draft a follow-up email for her?",
			},
			expected: {
				keywordGroups: [
					["inbox", "thread"],
					["follow-up", "follow up", "email"],
				],
			},
		},
		{
			input: {
				message: "Find all Acme contacts and draft a concise follow-up for the customer success lead",
			},
			expected: {
				keywordGroups: [
					["Acme", "contacts"],
					["follow-up", "follow up", "customer success"],
				],
			},
		},
	],
	task: async ({ message }) => {
		const { output } = await generateText({
			...models.fast,
			output: Output.object({
				schema: dashboardChatTitleSchema,
			}),
			prompt: dashboardChatTitlePrompt({ message }),
		});

		return output.title.trim();
	},
	scorers: [wordBudgetScorer, noQuotesScorer, noTrailingPunctuationScorer, keywordCoverageScorer],
});
