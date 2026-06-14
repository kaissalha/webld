import { Output, generateText } from "ai";
import { createScorer, evalite } from "evalite";

import { models } from "@starter/ai/models";
import { buildMailClassificationPrompt, mailThreadClassificationSchema } from "@starter/ai/prompts";

const MAIL_CLASSIFICATION_LABELS = ["to respond", "meeting update", "fyi", "notification", "marketing"] as const;

const MAIL_CLASSIFICATION_LABEL_DEFINITIONS = {
	"to respond": {
		description: "The mailbox owner should send a direct human reply or confirmation next.",
	},
	"meeting update": {
		description: "The message is mainly about scheduling, invites, reschedules, agendas, or meeting logistics.",
	},
	fyi: {
		description: "The message is informational and does not clearly require action from the mailbox owner.",
	},
	notification: {
		description: "The message is an automated or transactional alert, reminder, receipt, or status update.",
	},
	marketing: {
		description: "The message is promotional, newsletter-like, sales-oriented, or announcement-driven.",
	},
} satisfies Record<(typeof MAIL_CLASSIFICATION_LABELS)[number], { description: string }>;

type MailClassificationInput = {
	connectionEmail: string;
	threads: {
		id: string;
		sender: {
			email: string;
			name?: string;
		};
		snippet: string;
		subject: string;
	}[];
};

type MailClassificationOutput = {
	classifications: {
		label: string;
		threadId: string;
	}[];
};

type MailClassificationExpected = {
	labelsByThreadId: Record<string, string>;
};

const exactLabelScorer = createScorer<MailClassificationInput, MailClassificationOutput, MailClassificationExpected>({
	name: "Correct label per thread",
	scorer: ({ output, expected }) => {
		const expectedEntries = Object.entries(expected.labelsByThreadId);
		const outputLabelsByThreadId = output.classifications.reduce<Map<string, string>>(
			(labelsByThreadId, classification) => {
				labelsByThreadId.set(classification.threadId, classification.label);
				return labelsByThreadId;
			},
			new Map()
		);
		const correctCount = expectedEntries.filter(
			([threadId, expectedLabel]) => outputLabelsByThreadId.get(threadId) === expectedLabel
		).length;

		return correctCount / expectedEntries.length;
	},
});

const completeCoverageScorer = createScorer<
	MailClassificationInput,
	MailClassificationOutput,
	MailClassificationExpected
>({
	name: "Classifies every requested thread once",
	scorer: ({ output, input }) => {
		const requestedThreadIds = new Set(input.threads.map((thread) => thread.id));
		const outputThreadIds = output.classifications.map((classification) => classification.threadId);
		const uniqueOutputThreadIds = new Set(outputThreadIds);

		return outputThreadIds.length === input.threads.length &&
			uniqueOutputThreadIds.size === input.threads.length &&
			outputThreadIds.every((threadId) => requestedThreadIds.has(threadId))
			? 1
			: 0;
	},
});

evalite<MailClassificationInput, MailClassificationOutput, MailClassificationExpected>("Mail classification prompt", {
	data: [
		{
			input: {
				connectionEmail: "owner@example.com",
				threads: [
					{
						id: "thread-respond",
						sender: {
							email: "lead@example.com",
							name: "Maya Lin",
						},
						snippet: "Thanks for the proposal. Can you confirm whether onboarding can start this week?",
						subject: "Question about onboarding timing",
					},
					{
						id: "thread-marketing",
						sender: {
							email: "newsletter@vendor.example",
							name: "Sales Tools Weekly",
						},
						snippet: "Spring sale: save 30% on enrichment tools this week only.",
						subject: "Limited time sales tooling offer",
					},
					{
						id: "thread-meeting",
						sender: {
							email: "calendar@example.com",
						},
						snippet: "The demo was moved from 2:00 PM to 3:30 PM. Updated joining details attached.",
						subject: "Updated invitation: Maya Lin demo follow-up",
					},
				],
			},
			expected: {
				labelsByThreadId: {
					"thread-marketing": "marketing",
					"thread-meeting": "meeting update",
					"thread-respond": "to respond",
				},
			},
		},
		{
			input: {
				connectionEmail: "owner@example.com",
				threads: [
					{
						id: "thread-notification",
						sender: {
							email: "billing@payments.example",
						},
						snippet: "Receipt for invoice 4832. Your card was charged successfully.",
						subject: "Payment receipt",
					},
					{
						id: "thread-fyi",
						sender: {
							email: "colleague@example.com",
							name: "Rowan",
						},
						snippet: "Sharing the note we discussed. No action needed, just thought it was useful.",
						subject: "Market research note",
					},
				],
			},
			expected: {
				labelsByThreadId: {
					"thread-fyi": "fyi",
					"thread-notification": "notification",
				},
			},
		},
	],
	task: async ({ connectionEmail, threads }) => {
		const schema = mailThreadClassificationSchema({
			labels: MAIL_CLASSIFICATION_LABELS,
			threadIds: threads.map((thread) => thread.id),
		});
		const { output } = await generateText({
			model: models.mailClassification.model,
			output: Output.object({
				schema,
			}),
			prompt: buildMailClassificationPrompt({
				connectionEmail,
				labelDefinitions: MAIL_CLASSIFICATION_LABELS.map((label) => ({
					description: MAIL_CLASSIFICATION_LABEL_DEFINITIONS[label].description,
					label,
				})),
				threads,
			}),
			temperature: 0,
		});

		return schema.parse(output);
	},
	scorers: [completeCoverageScorer, exactLabelScorer],
});
