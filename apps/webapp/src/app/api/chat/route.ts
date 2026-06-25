import { headers } from "next/headers";
import { after, NextResponse } from "next/server";

import {
	convertToModelMessages,
	createUIMessageStream,
	generateText,
	isTextUIPart,
	JsonToSseTransformStream,
	lastAssistantMessageIsCompleteWithToolCalls,
	Output,
	smoothStream,
	toUIMessageStream,
	validateUIMessages,
} from "ai";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { convertDbMessagesForUI, streamContext } from "@/utils/chat-utils";
import { withErrorHandler } from "@/utils/with-error-handler";
import { healModelMessages } from "@webld/ai/heal-messages";
import { models } from "@webld/ai/models";
import { dashboardChatTitlePrompt, dashboardChatTitleSchema, memoryContextPrompt } from "@webld/ai/prompts";
import { logger } from "@webld/logger/server";
import {
	createStreamId,
	dashboardChatAgent,
	type DashboardChatUIMessage,
	embedChatMessage,
	episodeToText,
	extractAndUpdateMemories,
	generateRagEmbedding,
	getChatWithMessages,
	getStream,
	memoryToText,
	messageHistoryToQuery,
	reflectOnChat,
	saveChat,
	saveOrUpdateChatMessage,
	searchMemories,
	searchOlderMessages,
	searchRelatedChats,
	updateChatTitle,
	waitForFilesReady,
} from "@webld/server";
import { auth } from "@webld/server/auth";

const MEMORY_WINDOW_SIZE = 10;
const OLD_MESSAGES_TO_USE = 10;
const MEMORIES_TO_USE = 3;
const RELATED_CHATS_TO_USE = 3;

const dashboardChatRequestSchema = z.object({
	message: z.looseObject({}),
	chatId: z.uuid(),
});

const attachmentDataSchema = z.object({
	fileId: z.uuid(),
	filename: z.string().min(1),
	mediaType: z.string().min(1),
});

const getMessageText = (message: DashboardChatUIMessage) =>
	message.parts
		.filter(isTextUIPart)
		.map((part) => part.text)
		.join(" ");

const isModelSupportedAttachment = ({ mediaType }: { mediaType: string }) =>
	mediaType.startsWith("image/") || mediaType === "application/pdf";

// Images are sent inline to the model and indexed for metadata only (no chunks), so they
// neither gate the response on indexing nor get a retrieveKnowledge instruction.
const isImageAttachment = ({ mediaType }: { mediaType: string }) => mediaType.startsWith("image/");

const getIndexedAttachments = (message: DashboardChatUIMessage) =>
	message.parts.flatMap((part) => {
		if (part.type !== "data-attachment") {
			return [];
		}

		const result = attachmentDataSchema.safeParse(part.data);

		if (!result.success) {
			return [];
		}

		return [result.data];
	});

const prepareMessagesForModel = (messages: DashboardChatUIMessage[]): DashboardChatUIMessage[] =>
	messages.map((message) => {
		const droppedAttachments: string[] = [];
		const indexedAttachments = getIndexedAttachments(message);
		const documentAttachments = indexedAttachments.filter((attachment) => !isImageAttachment(attachment));
		const hasAttachmentDataPart = message.parts.some((part) => part.type === "data-attachment");

		for (const part of message.parts) {
			if (part.type === "file" && !isModelSupportedAttachment({ mediaType: part.mediaType })) {
				droppedAttachments.push(part.filename ?? "attachment");
			}
		}

		if (droppedAttachments.length === 0 && indexedAttachments.length === 0 && !hasAttachmentDataPart) {
			return message;
		}

		const nextParts: DashboardChatUIMessage["parts"] = message.parts.filter((part) => {
			if (part.type === "data-attachment") {
				return false;
			}

			return part.type !== "file" || isModelSupportedAttachment({ mediaType: part.mediaType });
		});

		if (documentAttachments.length > 0) {
			const attachmentList = documentAttachments
				.map((attachment) => `${attachment.filename} (${attachment.fileId})`)
				.join(", ");

			nextParts.push({
				type: "text",
				text: `[The user attached indexed document(s): ${attachmentList}. The content is ready in the knowledge base; call retrieveKnowledge with a focused query before answering questions that depend on these files.]`,
			});
		}

		if (droppedAttachments.length > 0 && documentAttachments.length === 0) {
			nextParts.push({
				type: "text",
				text: `[The user attached ${droppedAttachments.join(", ")}, but the file content was not available to the model.]`,
			});
		}

		return {
			...message,
			parts: nextParts,
		};
	});

const createInitialChatTitle = (message: DashboardChatUIMessage) => {
	const messageText = getMessageText(message);

	if (!messageText) {
		return "New chat";
	}

	return messageText.slice(0, 50);
};

export const POST = withErrorHandler(async (req: Request) => {
	const [body, session] = await Promise.all([req.json(), auth.api.getSession({ headers: await headers() })]);

	if (!session) {
		return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
	}

	const organizationId = session.session.activeOrganizationId;

	if (!organizationId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 400 });
	}

	const parseResult = dashboardChatRequestSchema.safeParse(body);

	if (!parseResult.success) {
		return NextResponse.json({ error: "Invalid request data", details: parseResult.error.issues }, { status: 400 });
	}

	const { message, chatId } = parseResult.data;

	const [[chatMessage], existingChat] = await Promise.all([
		validateUIMessages<DashboardChatUIMessage>({ messages: [message] }),
		getChatWithMessages({ chatId, organizationId }),
	]);

	const isNewChat = !existingChat;

	if (chatMessage.role === "assistant" && !lastAssistantMessageIsCompleteWithToolCalls({ messages: [chatMessage] })) {
		return NextResponse.json({ error: "Submitted assistant message must contain tool results" }, { status: 400 });
	}

	const streamId = uuidv4();
	const userStopSignal = new AbortController();

	const uiMessagesFromDb = convertDbMessagesForUI<DashboardChatUIMessage>(existingChat?.messages ?? []);
	const uiMessages =
		chatMessage.role === "assistant"
			? [...uiMessagesFromDb.slice(0, -1), chatMessage]
			: [...uiMessagesFromDb, chatMessage];
	const documentAttachmentIds = getIndexedAttachments(chatMessage)
		.filter((attachment) => !isImageAttachment(attachment))
		.map((attachment) => attachment.fileId);

	// Once any turn carries an image, keep the whole chat on the vision model — the default
	// fast model can't read inline images, so a later "what's in the image?" would fail.
	const chatHasImageAttachment = uiMessages.some((message) =>
		message.parts.some((part) => part.type === "file" && part.mediaType.startsWith("image/"))
	);

	// None of these writes feed the model prompt, so they run concurrently with retrieval below
	// instead of sitting on the critical path to first token. (saveChat must land first so the
	// stream/message rows have a chat to reference; the other two are independent.)
	const persistMessagePromise = (async () => {
		if (isNewChat) {
			await saveChat({
				id: chatId,
				organizationId,
				title: createInitialChatTitle(chatMessage),
			});
		}

		await Promise.all([
			createStreamId({ streamId, chatId }),
			saveOrUpdateChatMessage(chatId, {
				id: chatMessage.id,
				role: chatMessage.role,
				parts: chatMessage.parts,
			}),
		]);
	})();

	if (documentAttachmentIds.length > 0) {
		// The model is told to call retrieveKnowledge for these docs, so they must be indexed first.
		// Images are excluded — they go inline to the model and are only enriched for metadata.
		// Keep the message persisted before the gate (matches prior behavior on failure).
		await persistMessagePromise;

		try {
			await waitForFilesReady({
				fileIds: documentAttachmentIds,
				organizationId,
				signal: userStopSignal.signal,
			});
		} catch (error) {
			logger.error({
				error,
				message: "Failed waiting for dashboard chat attachments",
				metadata: {
					chatId,
					fileIds: documentAttachmentIds,
					organizationId,
				},
			});

			return NextResponse.json(
				{
					error: error instanceof Error ? error.message : "Failed to index attachments",
				},
				{ status: 400 }
			);
		}
	}

	const recentMessages = uiMessages.slice(-MEMORY_WINDOW_SIZE);
	const olderMessages = uiMessages.slice(0, -MEMORY_WINDOW_SIZE);
	const recentMessageIds = recentMessages.map((message) => message.id);

	// Retrieval feeds the prompt and is the dominant pre-token latency; persistence overlaps it.
	// All three searches embed the same message-history query, so embed once and reuse it
	// instead of paying for three identical embedding round trips.
	const [[relevantOlderMessages, relevantMemories, relatedChats]] = await Promise.all([
		(async () => {
			const retrievalQuery = messageHistoryToQuery(recentMessages);
			const queryEmbedding = retrievalQuery.trim()
				? await generateRagEmbedding({ value: retrievalQuery })
				: undefined;

			return Promise.all([
				olderMessages.length > 0
					? searchOlderMessages({
							chatId,
							excludeMessageIds: recentMessageIds,
							organizationId,
							queryEmbedding,
							recentMessages,
							topK: OLD_MESSAGES_TO_USE,
						})
					: Promise.resolve([]),
				searchMemories({ messages: recentMessages, organizationId, queryEmbedding, topK: MEMORIES_TO_USE }),
				searchRelatedChats({
					currentChatId: chatId,
					messages: recentMessages,
					organizationId,
					queryEmbedding,
					topK: RELATED_CHATS_TO_USE,
				}),
			]);
		})(),
		persistMessagePromise,
	]);

	const relevantOlderMessageIds = new Set(relevantOlderMessages.map((result) => result.id));
	const oldMessagesToUse = olderMessages.filter((message) => relevantOlderMessageIds.has(message.id));
	const messageHistoryForLLM = [...oldMessagesToUse, ...recentMessages];

	const conversationHistory = recentMessages.flatMap((message) => {
		if (message.role !== "user" && message.role !== "assistant") {
			return [];
		}

		const content = getMessageText(message).trim();

		return content ? [{ role: message.role, content }] : [];
	});

	const { messages: modelMessages, repairs: messageRepairs } = healModelMessages(
		await convertToModelMessages(prepareMessagesForModel(messageHistoryForLLM), {
			ignoreIncompleteToolCalls: true,
		}),
		{
			provider: chatHasImageAttachment ? "google" : undefined,
			onRepair: (repair) => {
				logger.warn({
					message: "Message history healed before provider call",
					metadata: { chatId, repair },
				});
			},
		}
	);

	if (messageRepairs.length > 0) {
		logger.info({
			message: "Healed message history for provider compatibility",
			metadata: { chatId, repairsCount: messageRepairs.length, useVisionModel: chatHasImageAttachment },
		});
	}
	const memoryContext =
		relevantMemories.length > 0 || relatedChats.length > 0
			? memoryContextPrompt({
					memories: relevantMemories.map((result) => ({
						id: result.memory.id,
						text: memoryToText(result.memory),
					})),
					relatedChats: relatedChats.map((result) => episodeToText(result.episode)),
				})
			: undefined;

	let shouldRunCancellationLoop = true;

	const stream = createUIMessageStream<DashboardChatUIMessage>({
		execute: async ({ writer }) => {
			const checkCancellation = async () => {
				const currentStream = await getStream({ streamId });

				if (currentStream?.canceledAt) {
					userStopSignal.abort();
				}
			};

			const runCancellationLoop = async () => {
				while (shouldRunCancellationLoop && !userStopSignal.signal.aborted) {
					try {
						await checkCancellation();
					} catch (error) {
						logger.error({
							error,
							message: "Failed to check dashboard chat stream cancellation",
							metadata: {
								chatId,
								streamId,
							},
						});
					}

					if (!shouldRunCancellationLoop || userStopSignal.signal.aborted) {
						break;
					}

					await new Promise((resolve) => setTimeout(resolve, 500));
				}
			};

			if (isNewChat) {
				writer.write({
					type: "data-chat-created",
					data: { chatId },
					transient: true,
				});
			}

			runCancellationLoop();

			const result = await dashboardChatAgent.stream({
				messages: modelMessages,
				options: {
					aiContext: {
						conversationHistory,
						currentUser: {
							email: session.user.email ?? undefined,
							name: session.user.name ?? undefined,
						},
						memoryContext,
						organizationId,
					},
					useVisionModel: chatHasImageAttachment,
				},
				abortSignal: userStopSignal.signal,
				experimental_transform: smoothStream({ chunking: "word" }),
			});

			result.consumeStream();
			writer.merge(toUIMessageStream({ stream: result.stream, sendReasoning: true }));
		},
		generateId: uuidv4,
		onFinish: async ({ messages: finishedMessages }) => {
			shouldRunCancellationLoop = false;

			const assistantMessages = finishedMessages.filter((message) => message.role === "assistant");

			await Promise.all(
				assistantMessages.map((message) =>
					saveOrUpdateChatMessage(chatId, {
						id: message.id,
						role: "assistant",
						parts: message.parts,
					})
				)
			);

			after(async () => {
				try {
					await Promise.all([
						chatMessage.role === "user"
							? embedChatMessage({ message: { id: chatMessage.id, parts: chatMessage.parts } })
							: Promise.resolve(),
						...assistantMessages.map((message) =>
							embedChatMessage({ message: { id: message.id, parts: message.parts } })
						),
					]);

					await extractAndUpdateMemories({
						chatId,
						messages: [...recentMessages, ...assistantMessages],
						organizationId,
					});

					await reflectOnChat({ chatId, organizationId });
				} catch (error) {
					logger.error({
						error,
						message: "Error updating dashboard chat memory",
						metadata: { chatId, organizationId },
					});
				}
			});

			if (!isNewChat) {
				return;
			}

			const firstMessageText = getMessageText(chatMessage);

			if (!firstMessageText) {
				return;
			}

			after(async () => {
				try {
					const { output } = await generateText({
						...models.cheapFast,
						output: Output.object({
							schema: dashboardChatTitleSchema,
						}),
						prompt: dashboardChatTitlePrompt({
							message: firstMessageText,
						}),
					});

					await updateChatTitle({
						chatId,
						organizationId,
						title: output.title,
					});
				} catch (error) {
					logger.error({
						error,
						message: "Error generating dashboard chat title",
						metadata: {
							chatId,
						},
					});
				}
			});
		},
		onError: (error) => {
			shouldRunCancellationLoop = false;
			logger.error({
				error,
				message: "Error in dashboard chat stream",
				metadata: {
					chatId,
					organizationId,
				},
			});
			return "Oops, an error occurred!";
		},
	});

	return new NextResponse(
		await streamContext.resumableStream(streamId, () => stream.pipeThrough(new JsonToSseTransformStream()))
	);
});
