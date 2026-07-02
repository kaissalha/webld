import { createRoute, z } from "@hono/zod-openapi";
import {
	convertToModelMessages,
	createUIMessageStream,
	isTextUIPart,
	JsonToSseTransformStream,
	lastAssistantMessageIsCompleteWithToolCalls,
	smoothStream,
	toUIMessageStream,
	validateUIMessages,
} from "ai";
import { HTTPException } from "hono/http-exception";
import { v4 as uuidv4 } from "uuid";

import { generateDashboardChatTitle } from "@webld/ai/generate-dashboard-chat-title";
import { healModelMessages } from "@webld/ai/heal-messages";
import { memoryContextPrompt } from "@webld/ai/prompts";

import { dashboardChatAgent } from "../../ai/agents/dashboard-chat-agent";
import type { BaseChatUIMessage, DashboardChatUIMessage } from "../../ai/types";
import {
	cancelStream,
	convertDbMessagesForUI,
	getChat,
	getChatMessagesFromDb,
	getChatWithMessages,
	getLastStreamId,
	saveChat,
	saveOrUpdateChatMessage,
	setLastStreamId,
	updateChatTitle,
} from "../../services/chat";
import {
	embedChatMessage,
	episodeToText,
	extractAndUpdateMemories,
	memoryToText,
	messageHistoryToQuery,
	reflectOnChat,
	searchMemories,
	searchOlderMessages,
	searchRelatedChats,
	type TextualMessage,
} from "../../services/memory";
import { generateRagEmbedding } from "../../services/rag";
import { waitForFilesReady } from "../../services/storage";
import type { CreateApiAppOptions } from "../context";
import { logServerEvent } from "../logger";
import { createRequireAuth, requireActiveOrganization } from "../middleware/auth";
import { betterAuthSecurity } from "../openapi";
import { createApiRouter } from "../router";
import { errorResponse, uiMessageSchema } from "../schemas";

const MEMORY_WINDOW_SIZE = 10;
const OLD_MESSAGES_TO_USE = 10;
const MEMORIES_TO_USE = 3;
const RELATED_CHATS_TO_USE = 3;

const chatIdParamsSchema = z.object({
	chatId: z.uuid().openapi({
		param: {
			name: "chatId",
			in: "path",
		},
		example: "018ff7c2-1f7c-7b28-b6c1-3f2e60b5d32d",
	}),
});

const messageParamsSchema = chatIdParamsSchema.extend({
	messageId: z
		.string()
		.min(1)
		.openapi({
			param: {
				name: "messageId",
				in: "path",
			},
			example: "018ff7c2-1f7c-7b28-b6c1-3f2e60b5d32e",
		}),
});

const messageBodySchema = z.object({
	message: uiMessageSchema,
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
		const documentAttachments = indexedAttachments.filter(
			(attachment) => !attachment.mediaType.startsWith("image/")
		);
		const hasAttachmentDataPart = message.parts.some((part) => part.type === "data-attachment");

		for (const part of message.parts) {
			if (part.type === "file" && !part.mediaType.startsWith("image/") && part.mediaType !== "application/pdf") {
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

			return part.type !== "file" || part.mediaType.startsWith("image/") || part.mediaType === "application/pdf";
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

const createChatStreamRoute = createRoute({
	method: "post",
	path: "/chats/{chatId}/stream",
	operationId: "createChatStream",
	summary: "Create or continue a chat completion stream",
	description: "Persists the submitted UI message, enriches context, and returns a resumable SSE stream.",
	tags: ["chats"],
	security: betterAuthSecurity,
	request: {
		params: chatIdParamsSchema,
		body: {
			required: true,
			content: {
				"application/json": {
					schema: messageBodySchema.openapi("CreateChatStreamInput"),
				},
			},
		},
	},
	responses: {
		200: {
			description: "A text/event-stream response containing UI message stream events.",
			content: {
				"text/event-stream": {
					schema: z.string(),
				},
			},
		},
		400: errorResponse("Invalid chat request."),
		401: errorResponse("Authentication is required."),
	},
});

const getChatStreamRoute = createRoute({
	method: "get",
	path: "/chats/{chatId}/stream",
	operationId: "getChatStream",
	summary: "Resume the active chat completion stream",
	tags: ["chats"],
	security: betterAuthSecurity,
	request: {
		params: chatIdParamsSchema,
	},
	responses: {
		200: {
			description: "A text/event-stream response for the active or recently completed stream.",
			content: {
				"text/event-stream": {
					schema: z.string(),
				},
			},
		},
		401: errorResponse("Authentication is required."),
		404: errorResponse("No resumable stream was found."),
	},
});

const cancelChatStreamRoute = createRoute({
	method: "delete",
	path: "/chats/{chatId}/stream",
	operationId: "cancelChatStream",
	summary: "Cancel the active chat completion stream",
	tags: ["chats"],
	security: betterAuthSecurity,
	request: {
		params: chatIdParamsSchema,
	},
	responses: {
		204: {
			description: "The stream was cancelled or already inactive.",
		},
		401: errorResponse("Authentication is required."),
		403: errorResponse("The authenticated user cannot access this chat."),
	},
});

const saveChatMessageRoute = createRoute({
	method: "put",
	path: "/chats/{chatId}/messages/{messageId}",
	operationId: "saveChatMessage",
	summary: "Create or replace a chat message",
	tags: ["chats"],
	security: betterAuthSecurity,
	request: {
		params: messageParamsSchema,
		body: {
			required: true,
			content: {
				"application/json": {
					schema: messageBodySchema.openapi("SaveChatMessageInput"),
				},
			},
		},
	},
	responses: {
		204: {
			description: "The message was saved.",
		},
		400: errorResponse("Invalid message payload."),
		401: errorResponse("Authentication is required."),
		403: errorResponse("The authenticated user cannot access this chat."),
	},
});

export const createChatsRoutes = (options: CreateApiAppOptions) => {
	const router = createApiRouter();

	router.use("/chats/*", createRequireAuth(options));

	return router
		.openapi(saveChatMessageRoute, async (c) => {
			const session = c.get("session");
			const organizationId = requireActiveOrganization(session);
			const { chatId, messageId } = c.req.valid("param");
			const { message } = c.req.valid("json");

			if (message.id !== messageId) {
				throw new HTTPException(400, { message: "Message id must match the messageId path parameter." });
			}

			const chat = await getChat(chatId, organizationId);

			if (!chat) {
				throw new HTTPException(403, { message: "Access to chat forbidden" });
			}

			await saveOrUpdateChatMessage(chatId, message as unknown as BaseChatUIMessage);

			return c.body(null, 204);
		})
		.openapi(getChatStreamRoute, async (c) => {
			const session = c.get("session");
			const { chatId } = c.req.valid("param");
			const resumeRequestedAt = new Date();
			const organizationId = requireActiveOrganization(session);
			const recentStreamId = await getLastStreamId({ chatId });

			if (!recentStreamId) {
				throw new HTTPException(404, { message: "No streams found" });
			}

			const emptyDataStream = createUIMessageStream<DashboardChatUIMessage>({
				execute: () => undefined,
			});

			const stream = await options.streamContext.resumableStream(recentStreamId, () =>
				emptyDataStream.pipeThrough(new JsonToSseTransformStream())
			);

			if (!stream) {
				const messages = await getChatMessagesFromDb({ chatId, organizationId });
				const mostRecentMessage = messages.at(-1);

				if (!mostRecentMessage || mostRecentMessage.role !== "assistant") {
					return new Response(emptyDataStream.pipeThrough(new JsonToSseTransformStream()), { status: 200 });
				}

				const messageCreatedAt = new Date(mostRecentMessage.createdAt);
				const ageInSeconds = (resumeRequestedAt.getTime() - messageCreatedAt.getTime()) / 1000;

				if (ageInSeconds > 15) {
					return new Response(emptyDataStream.pipeThrough(new JsonToSseTransformStream()), { status: 200 });
				}

				const restoredStream = createUIMessageStream<DashboardChatUIMessage>({
					execute: ({ writer }) => {
						writer.write({
							type: "data-append-message",
							data: JSON.stringify(mostRecentMessage),
							transient: true,
						} as Parameters<typeof writer.write>[0]);
					},
				});

				return new Response(restoredStream.pipeThrough(new JsonToSseTransformStream()), { status: 200 });
			}

			return new Response(stream, { status: 200 });
		})
		.openapi(cancelChatStreamRoute, async (c) => {
			const session = c.get("session");
			const { chatId } = c.req.valid("param");
			const organizationId = requireActiveOrganization(session);
			const chat = await getChat(chatId, organizationId);

			if (!chat) {
				throw new HTTPException(403, { message: "Access to chat forbidden" });
			}

			const recentStreamId = await getLastStreamId({ chatId });

			if (recentStreamId) {
				await cancelStream({ chatId });
			}

			return c.body(null, 204);
		})
		.openapi(createChatStreamRoute, async (c) => {
			const session = c.get("session");
			const organizationId = requireActiveOrganization(session);
			const { chatId } = c.req.valid("param");
			const { message } = c.req.valid("json");

			const [[chatMessage], existingChat] = await Promise.all([
				validateUIMessages<DashboardChatUIMessage>({ messages: [message] }),
				getChatWithMessages({ chatId, organizationId }),
			]);

			const isNewChat = !existingChat;

			if (
				chatMessage.role === "assistant" &&
				!lastAssistantMessageIsCompleteWithToolCalls({ messages: [chatMessage] })
			) {
				throw new HTTPException(400, { message: "Submitted assistant message must contain tool results" });
			}

			const streamId = uuidv4();
			const userStopSignal = new AbortController();
			const uiMessagesFromDb = convertDbMessagesForUI<DashboardChatUIMessage>(existingChat?.messages ?? []);
			const uiMessages =
				chatMessage.role === "assistant"
					? [...uiMessagesFromDb.slice(0, -1), chatMessage]
					: [...uiMessagesFromDb, chatMessage];
			const documentAttachmentIds = getIndexedAttachments(chatMessage)
				.filter((attachment) => !attachment.mediaType.startsWith("image/"))
				.map((attachment) => attachment.fileId);
			const chatHasImageAttachment = uiMessages.some((message) =>
				message.parts.some((part) => part.type === "file" && part.mediaType.startsWith("image/"))
			);

			const persistMessagePromise = (async () => {
				if (isNewChat) {
					await saveChat({
						id: chatId,
						organizationId,
						title: getMessageText(chatMessage).slice(0, 50) || "New chat",
					});
				}

				await Promise.all([
					setLastStreamId({ streamId, chatId }),
					saveOrUpdateChatMessage(chatId, {
						id: chatMessage.id,
						role: chatMessage.role,
						parts: chatMessage.parts,
					}),
				]);
			})();

			if (documentAttachmentIds.length > 0) {
				await persistMessagePromise;

				try {
					await waitForFilesReady({
						fileIds: documentAttachmentIds,
						organizationId,
						signal: userStopSignal.signal,
					});
				} catch (error) {
					await logServerEvent({
						level: "error",
						error,
						message: "Failed waiting for dashboard chat attachments",
						metadata: {
							chatId,
							fileIds: documentAttachmentIds,
							organizationId,
						},
					});

					throw new HTTPException(400, {
						message: error instanceof Error ? error.message : "Failed to index attachments",
					});
				}
			}

			const recentMessages = uiMessages.slice(-MEMORY_WINDOW_SIZE);
			const olderMessages = uiMessages.slice(0, -MEMORY_WINDOW_SIZE);
			const recentMessageIds = recentMessages.map((recentMessage) => recentMessage.id);
			const recentMessagesForRetrieval: TextualMessage[] = recentMessages.map((recentMessage) => ({
				role: recentMessage.role,
				parts: recentMessage.parts as TextualMessage["parts"],
			}));

			const [[relevantOlderMessages, relevantMemories, relatedChats]] = await Promise.all([
				(async () => {
					const retrievalQuery = messageHistoryToQuery(recentMessagesForRetrieval);
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
									recentMessages: recentMessagesForRetrieval,
									topK: OLD_MESSAGES_TO_USE,
								})
							: Promise.resolve([] as Awaited<ReturnType<typeof searchOlderMessages>>),
						searchMemories({
							messages: recentMessagesForRetrieval,
							organizationId,
							queryEmbedding,
							topK: MEMORIES_TO_USE,
						}),
						searchRelatedChats({
							currentChatId: chatId,
							messages: recentMessagesForRetrieval,
							organizationId,
							queryEmbedding,
							topK: RELATED_CHATS_TO_USE,
						}),
					]);
				})(),
				persistMessagePromise,
			]);

			const relevantOlderMessageIds = new Set(relevantOlderMessages.map((result) => result.id));
			const oldMessagesToUse = olderMessages.filter((olderMessage) =>
				relevantOlderMessageIds.has(olderMessage.id)
			);
			const messageHistoryForLLM = [...oldMessagesToUse, ...recentMessages];

			const conversationHistory = recentMessages.flatMap((recentMessage) => {
				if (recentMessage.role !== "user" && recentMessage.role !== "assistant") {
					return [];
				}

				const content = getMessageText(recentMessage).trim();

				return content ? [{ role: recentMessage.role, content }] : [];
			});

			const { messages: modelMessages, repairs: messageRepairs } = healModelMessages(
				await convertToModelMessages(prepareMessagesForModel(messageHistoryForLLM), {
					ignoreIncompleteToolCalls: true,
				}),
				{
					provider: chatHasImageAttachment ? "google" : undefined,
					onRepair: (repair) => {
						void logServerEvent({
							level: "warn",
							message: "Message history healed before provider call",
							metadata: { chatId, repair },
						});
					},
				}
			);

			if (messageRepairs.length > 0) {
				await logServerEvent({
					level: "info",
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
						if ((await getLastStreamId({ chatId })) !== streamId) {
							userStopSignal.abort();
						}
					};

					const runCancellationLoop = async () => {
						while (shouldRunCancellationLoop && !userStopSignal.signal.aborted) {
							try {
								await checkCancellation();
							} catch (error) {
								await logServerEvent({
									level: "error",
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

					void runCancellationLoop();

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

					writer.merge(toUIMessageStream({ stream: result.stream, sendReasoning: true }));
				},
				generateId: uuidv4,
				onFinish: async ({ messages: finishedMessages }) => {
					shouldRunCancellationLoop = false;

					const assistantMessages = finishedMessages.filter(
						(finishedMessage) => finishedMessage.role === "assistant"
					);

					await Promise.all(
						assistantMessages.map((assistantMessage) =>
							saveOrUpdateChatMessage(chatId, {
								id: assistantMessage.id,
								role: "assistant",
								parts: assistantMessage.parts,
							})
						)
					);

					options.scheduleAfter(async () => {
						try {
							await Promise.all([
								chatMessage.role === "user"
									? embedChatMessage({
											message: {
												id: chatMessage.id,
												parts: chatMessage.parts as TextualMessage["parts"],
											},
										})
									: Promise.resolve(),
								...assistantMessages.map((assistantMessage) =>
									embedChatMessage({
										message: {
											id: assistantMessage.id,
											parts: assistantMessage.parts as TextualMessage["parts"],
										},
									})
								),
							]);

							await extractAndUpdateMemories({
								chatId,
								messages: [...recentMessages, ...assistantMessages],
								organizationId,
							});

							await reflectOnChat({ chatId, organizationId });
						} catch (error) {
							await logServerEvent({
								level: "error",
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

					options.scheduleAfter(async () => {
						try {
							const title = await generateDashboardChatTitle({
								message: firstMessageText,
							});

							await updateChatTitle({
								chatId,
								organizationId,
								title,
							});
						} catch (error) {
							await logServerEvent({
								level: "error",
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
					void logServerEvent({
						level: "error",
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

			return new Response(
				await options.streamContext.resumableStream(streamId, () =>
					stream.pipeThrough(new JsonToSseTransformStream())
				)
			);
		});
};
