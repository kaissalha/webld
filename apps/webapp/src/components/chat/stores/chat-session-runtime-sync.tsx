"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useChat } from "@ai-sdk/react";
import { type DataUIPart, DefaultChatTransport } from "ai";
import { v4 as uuidv4 } from "uuid";
import type { StoreApi } from "zustand/vanilla";

import { useAutoResume } from "@/hooks/chat/use-auto-resume";
import type { BaseChatUIMessage } from "@webld/server";

import type { ChatSessionState } from "./chat-session-store";

export type ChatSessionRuntimeConfig = {
	chatId: string;
	api: string;
	chatMetadata?: Record<string, unknown>;
	autoResume?: boolean;
	onChatCreated?: (chatId: string) => void;
	onData?: (dataPart: DataUIPart<Record<string, unknown>>) => void;
};

type ChatSessionRuntimeProps = ChatSessionRuntimeConfig & {
	initialMessages: BaseChatUIMessage[];
	store: StoreApi<ChatSessionState>;
};

const EMPTY_CHAT_METADATA: Record<string, unknown> = {};

export const ChatSessionRuntime = ({
	chatId,
	initialMessages,
	api,
	chatMetadata = EMPTY_CHAT_METADATA,
	autoResume = true,
	onChatCreated,
	onData,
	store,
}: ChatSessionRuntimeProps) => {
	const [resumeDataParts, setResumeDataParts] = useState<DataUIPart<Record<string, unknown>>[]>([]);

	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api,
				credentials: "include",
				prepareSendMessagesRequest: ({ id, messages }) => ({
					body: { chatId: id, message: messages.at(-1), chatMetadata },
				}),
				prepareReconnectToStreamRequest: ({ id }) => ({ api: `${api}/${id}/stream` }),
			}),
		[api, chatMetadata]
	);

	const {
		messages,
		status,
		error,
		resumeStream,
		sendMessage,
		regenerate,
		addToolOutput,
		addToolApprovalResponse,
		setMessages,
		stop,
	} = useChat<BaseChatUIMessage>({
		id: chatId,
		experimental_throttle: 100,
		messages: initialMessages,
		generateId: () => uuidv4(),
		transport,
		sendAutomaticallyWhen: () => false,
		onData: (dataPart) => {
			if (dataPart.type === "data-append-message") {
				setResumeDataParts([dataPart]);
			}

			if (dataPart.type === "data-chat-created") {
				onChatCreated?.((dataPart.data as { chatId: string }).chatId);
			}

			onData?.(dataPart);
		},
	});

	const stopStream = useCallback(async () => {
		await fetch(`${api}/${chatId}/stream`, { method: "DELETE", credentials: "include" }).catch(() => undefined);
		stop();
	}, [api, chatId, stop]);

	useAutoResume({ autoResume, initialMessages, data: resumeDataParts, resumeStream, setMessages });

	useEffect(() => {
		store.setState({ messages, status, error });
	}, [store, messages, status, error]);

	useEffect(() => {
		store.setState({
			actions: {
				sendMessage,
				regenerate,
				resumeStream,
				setMessages,
				addToolOutput,
				addToolApprovalResponse,
				stop: stopStream,
			},
		});
	}, [store, sendMessage, regenerate, resumeStream, setMessages, addToolOutput, addToolApprovalResponse, stopStream]);

	return null;
};
