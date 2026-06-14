import { waitUntil } from "@vercel/functions";
import { Output, generateText } from "ai";

import { models } from "@webld/ai/models";
import { buildMailClassificationPrompt, mailThreadClassificationSchema } from "@webld/ai/prompts";
import {
	type GmailDriver,
	getMailClassificationLabelName,
	MAIL_CLASSIFICATION_LABELS,
	MAIL_CLASSIFICATION_LABEL_DEFINITIONS,
	type MailClassificationLabelName,
	type MailLabelSummary,
	type ThreadPreview,
} from "@webld/app-store";
import { logger } from "@webld/logger/server";

const MAIL_CLASSIFICATION_LABEL_WRITE_CONCURRENCY = 3;

type MailClassificationLabelOperation = {
	messageIds: string[];
	targetLabel: MailLabelSummary | null;
	threadId: string;
};

export const serializeMailLabel = ({
	color,
	id,
	name,
}: {
	color?:
		| {
				backgroundColor?: string | null;
				textColor?: string | null;
		  }
		| null
		| undefined;
	id?: string | null;
	name?: string | null;
}) => {
	if (!id || !name) {
		return null;
	}

	const classificationLabelName = getMailClassificationLabelName(name);
	const fallbackDefinition = classificationLabelName
		? MAIL_CLASSIFICATION_LABEL_DEFINITIONS[classificationLabelName]
		: null;

	return {
		backgroundColor: color?.backgroundColor ?? fallbackDefinition?.backgroundColor ?? null,
		id,
		name,
		textColor: color?.textColor ?? fallbackDefinition?.textColor ?? null,
	} satisfies MailLabelSummary;
};

const ensureMailClassificationLabels = async ({ driver }: { driver: GmailDriver }) => {
	let labels = await driver.getUserLabels();

	const ensuredLabels: MailLabelSummary[] = [];

	for (const labelName of MAIL_CLASSIFICATION_LABELS) {
		const existingLabel = labels.find((label) => getMailClassificationLabelName(label.name) === labelName);

		if (existingLabel) {
			const serializedLabel = serializeMailLabel(existingLabel);

			if (serializedLabel) {
				ensuredLabels.push(serializedLabel);
			}

			continue;
		}

		const labelDefinition = MAIL_CLASSIFICATION_LABEL_DEFINITIONS[labelName];

		try {
			const createdLabel = await driver.createUserLabel({
				backgroundColor: labelDefinition.backgroundColor,
				name: labelName,
				textColor: labelDefinition.textColor,
			});

			const serializedLabel = serializeMailLabel(createdLabel);

			if (serializedLabel) {
				labels = [...labels, createdLabel];
				ensuredLabels.push(serializedLabel);
			}
		} catch (error) {
			labels = await driver.getUserLabels();

			const recoveredLabel = labels.find((label) => getMailClassificationLabelName(label.name) === labelName);
			const serializedLabel = recoveredLabel ? serializeMailLabel(recoveredLabel) : null;

			if (serializedLabel) {
				ensuredLabels.push(serializedLabel);
				continue;
			}

			throw error;
		}
	}

	return ensuredLabels;
};

const classifyMailThreads = async ({
	connectionEmail,
	threads,
}: {
	connectionEmail: string;
	threads: Array<Pick<ThreadPreview, "id" | "sender" | "snippet" | "subject">>;
}) => {
	if (!threads.length) {
		return new Map<string, MailClassificationLabelName>();
	}

	const classificationSchema = mailThreadClassificationSchema({
		labels: MAIL_CLASSIFICATION_LABELS,
		threadIds: threads.map((thread) => thread.id),
	});

	const { output } = await generateText({
		model: models.mailClassification.model,
		output: Output.object({
			schema: classificationSchema,
		}),
		providerOptions: {
			gateway: {
				only: ["groq"],
				order: ["groq"],
			},
		},
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

	const parsedOutput = classificationSchema.parse(output);

	return parsedOutput.classifications.reduce<Map<string, MailClassificationLabelName>>(
		(classificationsByThreadId, classification) => {
			classificationsByThreadId.set(classification.threadId, classification.label);
			return classificationsByThreadId;
		},
		new Map()
	);
};

const applyMailClassificationLabelOperations = async ({
	classificationLabels,
	driver,
	operations,
}: {
	classificationLabels: MailLabelSummary[];
	driver: GmailDriver;
	operations: MailClassificationLabelOperation[];
}) => {
	const failedOperations: Array<{ errorMessage: string; threadId: string }> = [];
	const operationsWithTargetLabels = operations.filter((operation) => operation.targetLabel);
	const batchableOperations = operationsWithTargetLabels.filter((operation) => operation.messageIds.length > 0);
	const fallbackOperations = operationsWithTargetLabels.filter((operation) => !operation.messageIds.length);

	for (const targetLabel of classificationLabels) {
		const targetOperations = batchableOperations.filter(
			(operation) => operation.targetLabel?.id === targetLabel.id
		);

		if (!targetOperations.length) {
			continue;
		}

		try {
			await driver.setMessageLabels({
				addLabelIds: [targetLabel.id],
				messageIds: targetOperations.flatMap((operation) => operation.messageIds),
				removeLabelIds: classificationLabels
					.filter((label) => label.id !== targetLabel.id)
					.map((label) => label.id),
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "unknown";

			failedOperations.push(
				...targetOperations.map((operation) => ({
					errorMessage,
					threadId: operation.threadId,
				}))
			);
		}
	}

	for (
		let operationIndex = 0;
		operationIndex < fallbackOperations.length;
		operationIndex += MAIL_CLASSIFICATION_LABEL_WRITE_CONCURRENCY
	) {
		const currentOperations = fallbackOperations.slice(
			operationIndex,
			operationIndex + MAIL_CLASSIFICATION_LABEL_WRITE_CONCURRENCY
		);
		const results = await Promise.allSettled(
			currentOperations.map((operation) => {
				if (!operation.targetLabel) {
					return Promise.resolve();
				}

				return driver.setThreadLabels({
					addLabelIds: [operation.targetLabel.id],
					removeLabelIds: classificationLabels
						.filter((label) => label.id !== operation.targetLabel?.id)
						.map((label) => label.id),
					threadIds: [operation.threadId],
				});
			})
		);

		currentOperations.forEach((operation, index) => {
			if (!operation.targetLabel) {
				return;
			}

			const result = results[index];

			if (result?.status === "fulfilled") {
				return;
			}

			failedOperations.push({
				errorMessage:
					result?.status === "rejected" && result.reason instanceof Error ? result.reason.message : "unknown",
				threadId: operation.threadId,
			});
		});
	}

	return {
		failedOperations,
	};
};

export const scheduleMailClassificationLabelWrite = ({
	driver,
	nextClassifications,
	threads,
}: {
	driver: GmailDriver;
	nextClassifications: Map<string, MailClassificationLabelName>;
	threads: ThreadPreview[];
}) => {
	const writeLabels = async () => {
		let classificationLabels: MailLabelSummary[];

		try {
			classificationLabels = await ensureMailClassificationLabels({ driver });
		} catch (error) {
			logger.error({
				error,
				message: "Failed to ensure Gmail classification labels",
			});

			return;
		}

		const threadsById = threads.reduce<Map<string, ThreadPreview>>((nextThreadsById, thread) => {
			nextThreadsById.set(thread.id, thread);
			return nextThreadsById;
		}, new Map());
		const labelOperations = Array.from(nextClassifications.entries()).map(([threadId, labelName]) => ({
			messageIds: threadsById.get(threadId)?.messageIds ?? [],
			targetLabel:
				classificationLabels.find((label) => getMailClassificationLabelName(label.name) === labelName) ?? null,
			threadId,
		}));

		const { failedOperations } = await applyMailClassificationLabelOperations({
			classificationLabels,
			driver,
			operations: labelOperations,
		});

		if (failedOperations.length > 0) {
			logger.warn({
				message: "Some Gmail classification labels could not be applied",
				metadata: {
					failedOperations: failedOperations.slice(0, 10),
					failedOperationsCount: failedOperations.length,
				},
			});
		}
	};

	waitUntil(
		(async () => {
			try {
				await writeLabels();
			} catch (error) {
				logger.error({
					error,
					message: "Failed to apply Gmail classification labels",
					metadata: {
						threadIds: threads.map((thread) => thread.id),
					},
				});
			}
		})()
	);
};

export const getMailClassificationLabel = ({
	labelIds,
	labels,
}: {
	labelIds: string[];
	labels: MailLabelSummary[];
}) => {
	const labelIdSet = new Set(labelIds);

	return labels.find((label) => labelIdSet.has(label.id) && getMailClassificationLabelName(label.name)) ?? null;
};

const getAppMailClassificationLabels = () => {
	return MAIL_CLASSIFICATION_LABELS.reduce<Map<MailClassificationLabelName, MailLabelSummary>>(
		(labelsByName, labelName) => {
			const definition = MAIL_CLASSIFICATION_LABEL_DEFINITIONS[labelName];

			labelsByName.set(labelName, {
				backgroundColor: definition.backgroundColor,
				id: labelName,
				name: labelName,
				textColor: definition.textColor,
			});

			return labelsByName;
		},
		new Map()
	);
};

export const applyMailClassificationLabels = async ({
	applyNativeLabels = true,
	connectionEmail,
	driver,
	folder,
	threads,
}: {
	applyNativeLabels?: boolean;
	connectionEmail: string;
	driver: GmailDriver;
	folder?: string;
	threads: ThreadPreview[];
}) => {
	if (!threads.length || folder !== "inbox") {
		return threads;
	}

	const threadsNeedingClassification = threads.filter((thread) => {
		if (thread.labelIds.includes("DRAFT")) {
			return false;
		}

		if (thread.classificationLabel) {
			return false;
		}

		return thread.labelIds.every((labelId) => !getMailClassificationLabelName(labelId));
	});

	if (!threadsNeedingClassification.length) {
		return threads;
	}

	try {
		const nextClassifications = await classifyMailThreads({
			connectionEmail,
			threads: threadsNeedingClassification,
		});

		if (applyNativeLabels) {
			scheduleMailClassificationLabelWrite({
				driver,
				nextClassifications,
				threads: threadsNeedingClassification,
			});
		}

		const appClassificationLabels = getAppMailClassificationLabels();
		const appClassificationLabelIds = new Set<string>(MAIL_CLASSIFICATION_LABELS);

		const nextThreads = threads.map((thread) => {
			const nextLabelName = nextClassifications.get(thread.id);

			if (!nextLabelName) {
				return thread;
			}

			const nextLabel = appClassificationLabels.get(nextLabelName);
			const nextLabelIds = nextLabel
				? [...thread.labelIds.filter((labelId) => !appClassificationLabelIds.has(labelId)), nextLabel.id]
				: thread.labelIds;

			return {
				...thread,
				classificationLabel: nextLabel ?? null,
				labelIds: nextLabelIds,
			};
		});

		return nextThreads;
	} catch (error) {
		logger.error({
			error,
			message: "Failed to classify mail threads",
			metadata: {
				threadIds: threadsNeedingClassification.map((thread) => thread.id),
			},
		});

		return threads;
	}
};
