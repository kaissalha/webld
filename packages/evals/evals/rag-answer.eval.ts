import { createScorer, evalite } from "evalite";

import { ragAnswerSystemPrompt } from "@webld/ai/prompts";

type RagPromptInput = {
	question: string;
};

type RagPromptExpected = {
	requiredPhrases: string[];
};

const instructionCoverageScorer = createScorer<RagPromptInput, string, RagPromptExpected>({
	name: "RAG instructions cover retrieval, citations, and uncertainty",
	scorer: ({ expected, output }) => {
		const normalizedOutput = output.toLowerCase();
		const matches = expected.requiredPhrases.filter((phrase) => normalizedOutput.includes(phrase.toLowerCase()));

		return matches.length / expected.requiredPhrases.length;
	},
});

evalite<RagPromptInput, string, RagPromptExpected>("RAG answer system prompt", {
	data: [
		{
			input: {
				question: "What does our onboarding guide say about follow-up visits?",
			},
			expected: {
				requiredPhrases: ["retrieveKnowledge", "retrieved content", "cite sources", "does not contain enough"],
			},
		},
	],
	task: async () => ragAnswerSystemPrompt,
	scorers: [instructionCoverageScorer],
});
