import { createScorer, evalite } from "evalite";

import {
	fileClassificationSchema,
	fileClassificationSystemPrompt,
	imageClassificationSchema,
	imageClassificationSystemPrompt,
} from "@webld/ai/prompts";

import { scoreKeywordGroups } from "./utils";

type ClassificationPromptInput = {
	kind: "document" | "image";
};

type ClassificationPromptOutput = {
	acceptsValidSample: boolean;
	prompt: string;
	rejectsOversizedTags: boolean;
};

type ClassificationPromptExpected = {
	keywordGroups: string[][];
};

const promptInstructionScorer = createScorer<
	ClassificationPromptInput,
	ClassificationPromptOutput,
	ClassificationPromptExpected
>({
	name: "Classification prompt includes searchable metadata instructions",
	scorer: ({ expected, output }) => {
		return scoreKeywordGroups({ keywordGroups: expected.keywordGroups, text: output.prompt });
	},
});

const validSampleScorer = createScorer<
	ClassificationPromptInput,
	ClassificationPromptOutput,
	ClassificationPromptExpected
>({
	name: "Classification schema accepts valid metadata",
	scorer: ({ output }) => {
		return output.acceptsValidSample ? 1 : 0;
	},
});

const oversizedTagsScorer = createScorer<
	ClassificationPromptInput,
	ClassificationPromptOutput,
	ClassificationPromptExpected
>({
	name: "Classification schema rejects oversized tag lists",
	scorer: ({ output }) => {
		return output.rejectsOversizedTags ? 1 : 0;
	},
});

evalite<ClassificationPromptInput, ClassificationPromptOutput, ClassificationPromptExpected>(
	"File classification prompts",
	{
		data: [
			{
				input: { kind: "document" },
				expected: {
					keywordGroups: [
						["title", "human-readable"],
						["summary", "one sentence"],
						["date", "yyyy-mm-dd"],
						["language", "lowercase"],
						["tags", "keywords"],
						["no punctuation"],
					],
				},
			},
			{
				input: { kind: "image" },
				expected: {
					keywordGroups: [
						["visible text", "ocrtext"],
						["verbatim"],
						["date", "yyyy-mm-dd"],
						["language", "lowercase"],
						["tags", "keywords"],
						["title", "human-readable"],
					],
				},
			},
		],
		task: async ({ kind }) => {
			if (kind === "image") {
				const validSample = {
					date: "2025-03-14",
					language: "english",
					ocrText: "STARBUCKS 2025-03-14 TOTAL $42.00",
					summary: "A Starbucks receipt showing a March 2025 purchase.",
					tags: ["receipt", "starbucks", "purchase"],
					title: "Starbucks Receipt 2025-03-14",
				};
				const invalidSample = {
					...validSample,
					tags: ["receipt", "starbucks", "purchase", "coffee", "expense", "march", "card"],
				};

				return {
					acceptsValidSample: imageClassificationSchema.safeParse(validSample).success,
					prompt: imageClassificationSystemPrompt,
					rejectsOversizedTags: !imageClassificationSchema.safeParse(invalidSample).success,
				};
			}

			const validSample = {
				date: "2025-09-30",
				language: "english",
				summary: "An invoice for Acme Q3 services.",
				tags: ["invoice", "acme", "services"],
				title: "Acme Q3 2025 Services Invoice",
			};
			const invalidSample = {
				...validSample,
				tags: ["invoice", "acme", "services", "q3", "finance", "contract", "payment"],
			};

			return {
				acceptsValidSample: fileClassificationSchema.safeParse(validSample).success,
				prompt: fileClassificationSystemPrompt,
				rejectsOversizedTags: !fileClassificationSchema.safeParse(invalidSample).success,
			};
		},
		scorers: [promptInstructionScorer, validSampleScorer, oversizedTagsScorer],
	}
);
