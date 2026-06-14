"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useChat } from "@ai-sdk/react";
import { type DataUIPart, DefaultChatTransport } from "ai";
import { v4 as uuidv4 } from "uuid";

import { useChatSession, useChatSessionStoreApi } from "@/components/chat/stores/chat-session-store";
import { useAutoResume } from "@/hooks/chat/use-auto-resume";
import type { BaseChatUIMessage } from "@webld/server";

import { useStreamingMessageSnapshot } from "./use-streaming-message-snapshot";

type ChatRuntimeSyncProps = {
	chatId: string;
	initialMessages: BaseChatUIMessage[];
	api: string;
	chatMetadata?: Record<string, unknown>;
	autoResume?: boolean;
	onChatCreated?: (chatId: string) => void;
	onData?: (dataPart: DataUIPart<Record<string, unknown>>) => void;
};

const EMPTY_CHAT_METADATA: Record<string, unknown> = {};

export const ChatRuntimeSync = ({
	chatId,
	initialMessages,
	api,
	chatMetadata = EMPTY_CHAT_METADATA,
	autoResume = true,
	onChatCreated,
	onData,
}: ChatRuntimeSyncProps) => {
	const chatSessionStore = useChatSessionStoreApi();
	const getStreamingMessageSnapshot = useStreamingMessageSnapshot();
	const [resumeDataParts, setResumeDataParts] = useState<DataUIPart<Record<string, unknown>>[]>([]);
	const { setRuntimeBindings } = useChatSession((state) => ({
		setRuntimeBindings: state.setRuntimeBindings,
	}));

	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api,
				credentials: "include",
				prepareSendMessagesRequest: ({ id, messages }) => ({
					body: {
						chatId: id,
						message: messages.at(-1),
						chatMetadata,
					},
				}),
				prepareReconnectToStreamRequest: ({ id }) => ({
					api: `${api}/${id}/stream`,
				}),
			}),
		[api, chatMetadata]
	);

	const {
		messages,
		status,
		resumeStream,
		sendMessage,
		addToolOutput,
		addToolApprovalResponse,
		error,
		setMessages,
		stop,
	} = useChat<BaseChatUIMessage>({
		id: chatId,
		experimental_throttle: 100,
		messages: initialMessages,
		generateId: () => uuidv4(),
		transport,
		sendAutomaticallyWhen() {
			return false;
		},
		onData: (dataPart) => {
			if (dataPart.type === "data-append-message") {
				setResumeDataParts([dataPart]);
			}

			if (dataPart.type === "data-chat-created") {
				const { chatId: createdChatId } = dataPart.data as { chatId: string };
				onChatCreated?.(createdChatId);
			}

			onData?.(dataPart);
		},
	});

	const stopStreamAction = useCallback(async () => {
		await fetch(`${api}/${chatId}/stream`, {
			method: "DELETE",
			credentials: "include",
		}).catch(() => undefined);

		stop();
	}, [api, chatId, stop]);

	useAutoResume({
		autoResume,
		initialMessages,
		data: resumeDataParts,
		resumeStream,
		setMessages,
	});

	useEffect(() => {
		const lastMessage = messages.at(-1);
		const nextStreamingMessage = getStreamingMessageSnapshot(
			status === "streaming" && lastMessage?.role === "assistant" ? lastMessage : undefined
		);
		const nextMessages = nextStreamingMessage ? messages.slice(0, -1) : messages;

		chatSessionStore.setState((state) => {
			const hasSameMessages =
				state.messages.length === nextMessages.length &&
				state.messages.every((message, index) => message === nextMessages[index]);

			return {
				...state,
				messages: hasSameMessages ? state.messages : nextMessages,
				streamingMessage: nextStreamingMessage,
				status,
				error,
			};
		});
	}, [chatSessionStore, error, getStreamingMessageSnapshot, messages, status]);

	useEffect(() => {
		setRuntimeBindings({
			runtimeActions: {
				sendMessage,
				stop: stopStreamAction,
				resumeStream,
				setMessages,
			},
			addToolOutput,
			addToolApprovalResponse,
		});
	}, [
		addToolApprovalResponse,
		addToolOutput,
		resumeStream,
		sendMessage,
		setMessages,
		setRuntimeBindings,
		stopStreamAction,
	]);

	return null;
};
