import { createScorer, evalite } from "evalite";

import { dashboardChatSystemPrompt, type KnowledgeExcerptForPrompt, knowledgeContextPrompt } from "@webld/ai/prompts";

type SystemPromptInput = {
	scenario: string;
};

type SystemPromptExpected = {
	requiredPhrases: string[];
};

const instructionCoverageScorer = createScorer<SystemPromptInput, string, SystemPromptExpected>({
	name: "Dashboard prompt covers preload-first knowledge workflow",
	scorer: ({ expected, output }) => {
		const normalizedOutput = output.toLowerCase();
		const matches = expected.requiredPhrases.filter((phrase) => normalizedOutput.includes(phrase.toLowerCase()));

		return matches.length / expected.requiredPhrases.length;
	},
});

evalite<SystemPromptInput, string, SystemPromptExpected>("Dashboard chat system prompt", {
	data: [
		{
			input: {
				scenario: "Answering from preloaded knowledge without opening the turn with retrieval tool calls",
			},
			expected: {
				requiredPhrases: [
					"preloaded",
					"<knowledge>",
					"do not re-search",
					"getKnowledgeContent",
					"retrieveKnowledge",
					"citation numbers",
				],
			},
		},
	],
	task: async () => dashboardChatSystemPrompt(),
	scorers: [instructionCoverageScorer],
});

type KnowledgeContextInput = {
	excerpts: KnowledgeExcerptForPrompt[];
};

type KnowledgeContextExpected = {
	requiredPhrases: string[];
};

const excerptRenderingScorer = createScorer<KnowledgeContextInput, string, KnowledgeContextExpected>({
	name: "Knowledge context renders citations, chunk IDs, and sources",
	scorer: ({ expected, output }) => {
		const matches = expected.requiredPhrases.filter((phrase) => output.includes(phrase));

		return matches.length / expected.requiredPhrases.length;
	},
});

evalite<KnowledgeContextInput, string, KnowledgeContextExpected>("Knowledge context prompt", {
	data: [
		{
			input: {
				excerpts: [
					{
						chunkId: "chunk-1",
						content: "Follow-up visits happen within 14 days of onboarding.",
						source: "Onboarding guide",
					},
					{
						chunkId: "chunk-2",
						content: "Invoices are due net 30.",
						source: "Billing policy",
					},
				],
			},
			expected: {
				requiredPhrases: [
					'citation="[1]"',
					'citation="[2]"',
					'chunkId="chunk-1"',
					'chunkId="chunk-2"',
					'source="Onboarding guide"',
					'source="Billing policy"',
					"Follow-up visits happen within 14 days of onboarding.",
					"Invoices are due net 30.",
				],
			},
		},
	],
	task: async ({ excerpts }) => knowledgeContextPrompt({ excerpts }),
	scorers: [excerptRenderingScorer],
});
