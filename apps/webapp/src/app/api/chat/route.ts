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
	validateUIMessages,
} from "ai";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { convertDbMessagesForUI, streamContext } from "@/utils/chat-utils";
import { withErrorHandler } from "@/utils/with-error-handler";
import { models } from "@webld/ai/models";
import { dashboardChatTitlePrompt, dashboardChatTitleSchema } from "@webld/ai/prompts";
import { logger } from "@webld/logger/server";
import {
	createStreamId,
	dashboardChatAgent,
	type DashboardChatUIMessage,
	getChat,
	getChatMessagesFromDb,
	getStream,
	saveChat,
	saveOrUpdateChatMessage,
	updateChatTitle,
	waitForRagDocumentsReady,
} from "@webld/server";
import { auth } from "@webld/server/auth";

const dashboardChatRequestSchema = z.object({
	message: z.looseObject({}),
	chatId: z.uuid(),
});

const attachmentDataSchema = z.object({
	documentId: z.uuid(),
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

		if (indexedAttachments.length > 0) {
			const attachmentList = indexedAttachments
				.map((attachment) => `${attachment.filename} (${attachment.documentId})`)
				.join(", ");

			nextParts.push({
				type: "text",
				text: `[The user attached indexed document(s): ${attachmentList}. The content is ready in the knowledge base; call retrieveKnowledge with a focused query before answering questions that depend on these files.]`,
			});
		}

		if (droppedAttachments.length > 0 && indexedAttachments.length === 0) {
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

	const [chatMessage, existingChat] = await Promise.all([
		validateUIMessages<DashboardChatUIMessage>({ messages: [message] }).then((result) => result[0]),
		getChat(chatId, organizationId),
	]);

	const isNewChat = !existingChat;

	if (!isNewChat && existingChat.organizationId !== organizationId) {
		return NextResponse.json({ error: "Access to chat forbidden" }, { status: 403 });
	}

	if (chatMessage.role === "assistant" && !lastAssistantMessageIsCompleteWithToolCalls({ messages: [chatMessage] })) {
		return NextResponse.json({ error: "Submitted assistant message must contain tool results" }, { status: 400 });
	}

	if (isNewChat) {
		await saveChat({
			id: chatId,
			organizationId,
			title: createInitialChatTitle(chatMessage),
		});
	}

	const streamId = uuidv4();
	const userStopSignal = new AbortController();

	const [_, messagesFromDb] = await Promise.all([
		createStreamId({ streamId, chatId }),
		isNewChat ? Promise.resolve([]) : getChatMessagesFromDb({ chatId, organizationId }),
	]);

	const uiMessagesFromDb = convertDbMessagesForUI<DashboardChatUIMessage>(messagesFromDb);
	const uiMessages =
		chatMessage.role === "assistant"
			? [...uiMessagesFromDb.slice(0, -1), chatMessage]
			: [...uiMessagesFromDb, chatMessage];
	const indexedAttachmentIds = getIndexedAttachments(chatMessage).map((attachment) => attachment.documentId);

	await saveOrUpdateChatMessage(chatId, {
		id: chatMessage.id,
		role: chatMessage.role,
		parts: chatMessage.parts,
	});

	if (indexedAttachmentIds.length > 0) {
		try {
			await waitForRagDocumentsReady({
				documentIds: indexedAttachmentIds,
				organizationId,
				signal: userStopSignal.signal,
			});
		} catch (error) {
			logger.error({
				error,
				message: "Failed waiting for dashboard chat attachments",
				metadata: {
					chatId,
					documentIds: indexedAttachmentIds,
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

	const modelMessages = await convertToModelMessages(prepareMessagesForModel(uiMessages));
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
						currentUser: {
							email: session.user.email ?? undefined,
							name: session.user.name ?? undefined,
						},
						organizationId,
					},
				},
				abortSignal: userStopSignal.signal,
				experimental_transform: smoothStream({ chunking: "word" }),
			});

			result.consumeStream();
			writer.merge(result.toUIMessageStream({ sendReasoning: true }));
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
						model: models.fast.model,
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
