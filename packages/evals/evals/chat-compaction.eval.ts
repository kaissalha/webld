import { createScorer, evalite } from "evalite";

import { generateBlockSummary, type TextualMessage } from "@webld/server/memory";

import { countWords, normalizeText, scoreKeywordGroups } from "./utils";

const textMessage = (role: "assistant" | "user", text: string): TextualMessage => ({
	role,
	parts: [{ type: "text", text }],
});

type CompactionInput = {
	messages: TextualMessage[];
};

type CompactionExpected = {
	/** Each group is satisfied by any one of its phrasings surviving into the summary. */
	factGroups: string[][];
};

type CompactionOutput = {
	summary: string;
	tags: string[];
	title: string;
};

const factRetentionScorer = createScorer<CompactionInput, CompactionOutput, CompactionExpected>({
	name: "Summary retains exact facts from the span",
	scorer: ({ expected, output }) =>
		scoreKeywordGroups({
			keywordGroups: expected.factGroups,
			text: `${output.title}\n${output.summary}`,
		}),
});

const titleQualityScorer = createScorer<CompactionInput, CompactionOutput, CompactionExpected>({
	name: "Title is specific and 3-8 words",
	scorer: ({ output }) => {
		const words = countWords(output.title);
		const generic = ["discussion", "conversation", "chat", "misc"].some((word) =>
			normalizeText(output.title).includes(word)
		);

		return words >= 3 && words <= 8 && !generic ? 1 : 0;
	},
});

const tagsScorer = createScorer<CompactionInput, CompactionOutput, CompactionExpected>({
	name: "Tags present and lowercase",
	scorer: ({ output }) => {
		if (output.tags.length === 0 || output.tags.length > 6) {
			return 0;
		}

		return output.tags.every((tag) => tag === tag.toLowerCase()) ? 1 : 0;
	},
});

evalite<CompactionInput, CompactionOutput, CompactionExpected>("Chat compaction block summary", {
	data: [
		{
			input: {
				messages: [
					textMessage("user", "Can you check what discount we agreed with Acme Corp for the renewal?"),
					textMessage(
						"assistant",
						"Based on the knowledge base, the Acme Corp renewal was agreed at a 12% discount on the Growth plan, effective March 1st, 2026. Their point of contact is jane@acme.com."
					),
					textMessage("user", "Great, draft a follow-up email to Jane confirming that."),
					textMessage(
						"assistant",
						"I drafted an email to jane@acme.com confirming the 12% renewal discount on the Growth plan starting March 1st, 2026, and asked her to confirm the countersigned order form."
					),
					textMessage("user", "Perfect. Do not mention the old 8% offer we retracted."),
					textMessage(
						"assistant",
						"Understood - the draft makes no mention of the retracted 8% offer. It only confirms the agreed 12% discount."
					),
				],
			},
			expected: {
				factGroups: [
					["acme"],
					["12%", "12 percent"],
					["jane@acme.com", "jane"],
					["march 1", "2026-03-01", "march 1st"],
					["8%", "8 percent"],
				],
			},
		},
	],
	task: async ({ messages }) => generateBlockSummary({ messages }),
	scorers: [factRetentionScorer, titleQualityScorer, tagsScorer],
});
