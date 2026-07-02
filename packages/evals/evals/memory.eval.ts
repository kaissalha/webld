import { NoObjectGeneratedError, type UIMessage } from "ai";
import { createScorer, evalite } from "evalite";

import { type ModelConfig, models } from "@webld/ai/models";
import { chatReflectionSchema, type MemoryForPrompt, memoryExtractionSchema } from "@webld/ai/prompts";
import { extractMemories, generateChatReflection, type TextualMessage } from "@webld/server/memory";

import { countSentences, countWords, scoreKeywordGroups } from "./utils";

// The cheap and fast models both power memory generation in production. Running
// the same dataset across both surfaces the schema-echo regression (the model
// returning the JSON Schema instead of matching it) per model.
const modelVariants: { input: ModelConfig; name: string }[] = [
	{ input: models.cheapFast, name: "cheapFast" },
	{ input: models.fast, name: "fast" },
];

const textMessage = (role: "assistant" | "user", text: string): TextualMessage => ({
	role,
	parts: [{ type: "text", text }],
});

const uiMessage = (id: string, role: "assistant" | "user", text: string): UIMessage => ({
	id,
	role,
	parts: [{ type: "text", text }],
});

const isConcise = (value: string) => countWords(value) <= 30 && countSentences(value) <= 2;

const isPopulated = (value: string) => value.trim().length > 0 && value.trim().toUpperCase() !== "N/A";

// =============================================================================
// Chat reflection
// =============================================================================

type ReflectionInput = { messages: TextualMessage[]; title: string };

type ReflectionResult = { ok: false } | { ok: true; reflection: Awaited<ReturnType<typeof generateChatReflection>> };

type ReflectionExpected = Record<string, never>;

const reflectionSchemaScorer = createScorer<ReflectionInput, ReflectionResult, ReflectionExpected>({
	name: "Produces a schema-valid reflection",
	scorer: ({ output }) => (output.ok && chatReflectionSchema.safeParse(output.reflection).success ? 1 : 0),
});

const reflectionTagsScorer = createScorer<ReflectionInput, ReflectionResult, ReflectionExpected>({
	name: "Tags are 2-4 non-empty keywords",
	scorer: ({ output }) => {
		if (!output.ok) {
			return 0;
		}

		const { tags } = output.reflection;
		return tags.length >= 2 && tags.length <= 4 && tags.every((tag) => tag.trim().length > 0) ? 1 : 0;
	},
});

const reflectionFieldsPopulatedScorer = createScorer<ReflectionInput, ReflectionResult, ReflectionExpected>({
	name: "Summary/whatWorkedWell/whatToAvoid are populated",
	scorer: ({ output }) => {
		if (!output.ok) {
			return 0;
		}

		const { summary, whatToAvoid, whatWorkedWell } = output.reflection;
		const fields = [summary, whatWorkedWell, whatToAvoid];
		return fields.filter(isPopulated).length / fields.length;
	},
});

const reflectionConciseScorer = createScorer<ReflectionInput, ReflectionResult, ReflectionExpected>({
	name: "Reflection fields are concise sentences",
	scorer: ({ output }) => {
		if (!output.ok) {
			return 0;
		}

		const { summary, whatToAvoid, whatWorkedWell } = output.reflection;
		const fields = [summary, whatWorkedWell, whatToAvoid];
		return fields.filter(isConcise).length / fields.length;
	},
});

evalite.each(modelVariants)<ReflectionInput, ReflectionResult, ReflectionExpected>("Chat reflection prompt", {
	data: [
		{
			input: {
				title: "Follow-up email for Acme renewal",
				messages: [
					textMessage(
						"user",
						"Look through our knowledge base for the Acme renewal terms and draft a follow-up email to their success lead."
					),
					textMessage(
						"assistant",
						"I searched the knowledge base, found the renewal terms, and drafted a follow-up email to Jane at Acme confirming the renewal date and pricing."
					),
					textMessage("user", "That looks great, thanks."),
				],
			},
		},
		{
			input: {
				title: "Competitor pricing research",
				messages: [
					textMessage(
						"user",
						"Research how our top 3 competitors price their logistics software and summarize it."
					),
					textMessage(
						"assistant",
						"I searched the web and compiled a comparison of the three competitors' pricing tiers, then summarized where our mid-tier plan sits against them."
					),
					textMessage("user", "Perfect."),
				],
			},
		},
	],
	task: async (input, model): Promise<ReflectionResult> => {
		try {
			return { ok: true, reflection: await generateChatReflection({ chat: input, model }) };
		} catch (error) {
			if (NoObjectGeneratedError.isInstance(error)) {
				return { ok: false };
			}

			throw error;
		}
	},
	scorers: [reflectionSchemaScorer, reflectionTagsScorer, reflectionFieldsPopulatedScorer, reflectionConciseScorer],
});

// =============================================================================
// Memory extraction
// =============================================================================

type ExtractionInput = { existingMemories: MemoryForPrompt[]; messages: UIMessage[] };

type ExtractionResult =
	| { extraction: NonNullable<Awaited<ReturnType<typeof extractMemories>>>; ok: true }
	| { ok: false };

type ExtractionExpected = {
	factKeywordGroups: string[][];
	maxAdditions: number;
	minAdditions: number;
};

const extractionSchemaScorer = createScorer<ExtractionInput, ExtractionResult, ExtractionExpected>({
	name: "Produces a schema-valid extraction",
	scorer: ({ output }) => (output.ok && memoryExtractionSchema.safeParse(output.extraction).success ? 1 : 0),
});

const extractionVolumeScorer = createScorer<ExtractionInput, ExtractionResult, ExtractionExpected>({
	name: "Additions count is in the expected range",
	scorer: ({ expected, output }) => {
		if (!output.ok) {
			return 0;
		}

		const count = output.extraction.additions.length;
		return count >= expected.minAdditions && count <= expected.maxAdditions ? 1 : 0;
	},
});

const extractionWellFormedScorer = createScorer<ExtractionInput, ExtractionResult, ExtractionExpected>({
	name: "Additions have non-empty title and content",
	scorer: ({ output }) => {
		if (!output.ok) {
			return 0;
		}

		const { additions } = output.extraction;
		if (additions.length === 0) {
			return 1;
		}

		return additions.every((addition) => isPopulated(addition.title) && isPopulated(addition.content)) ? 1 : 0;
	},
});

const extractionCaptureScorer = createScorer<ExtractionInput, ExtractionResult, ExtractionExpected>({
	name: "Captures the durable facts",
	scorer: ({ expected, output }) => {
		if (expected.factKeywordGroups.length === 0) {
			return 1;
		}

		if (!output.ok) {
			return 0;
		}

		const text = output.extraction.additions.map((addition) => `${addition.title} ${addition.content}`).join("\n");

		return scoreKeywordGroups({ text, keywordGroups: expected.factKeywordGroups });
	},
});

evalite.each(modelVariants)<ExtractionInput, ExtractionResult, ExtractionExpected>("Memory extraction prompt", {
	data: [
		{
			input: {
				existingMemories: [],
				messages: [
					uiMessage(
						"extract-1-user",
						"user",
						"Quick context before we start: our company is Acme Logistics and we sell B2B freight-management software. I'm Sam and I always sign my emails as 'Sam'. We prefer short, bullet-point email drafts."
					),
					uiMessage(
						"extract-1-assistant",
						"assistant",
						"Understood — I'll keep drafts concise and bulleted and sign them as Sam."
					),
				],
			},
			expected: {
				minAdditions: 1,
				maxAdditions: 5,
				factKeywordGroups: [["acme", "logistics", "freight"], ["sam"], ["bullet", "concise", "short"]],
			},
		},
		{
			input: {
				existingMemories: [],
				messages: [
					uiMessage("extract-2-user", "user", "Can you search the knowledge base for today's standup notes?"),
					uiMessage(
						"extract-2-assistant",
						"assistant",
						"Sure, here are today's standup notes from the search."
					),
					uiMessage("extract-2-user-2", "user", "thanks"),
				],
			},
			expected: {
				minAdditions: 0,
				maxAdditions: 0,
				factKeywordGroups: [],
			},
		},
	],
	task: async (input, model): Promise<ExtractionResult> => {
		try {
			const extraction = await extractMemories({
				existingMemories: input.existingMemories,
				messages: input.messages,
				model,
			});

			return extraction ? { ok: true, extraction } : { ok: false };
		} catch (error) {
			if (NoObjectGeneratedError.isInstance(error)) {
				return { ok: false };
			}

			throw error;
		}
	},
	scorers: [extractionSchemaScorer, extractionVolumeScorer, extractionWellFormedScorer, extractionCaptureScorer],
});
