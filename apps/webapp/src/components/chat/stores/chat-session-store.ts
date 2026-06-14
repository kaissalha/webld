"use client";

import { createContext, createElement, type ReactNode, useContext, useMemo, useState } from "react";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatStatus } from "ai";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";
import { createStore, type StoreApi } from "zustand/vanilla";

import type { BaseChatUIMessage } from "@webld/server";

import {
	type ChatMessagePart,
	type ChatMessagePartType,
	type ChatSessionProjectionApi,
	createChatSessionProjectionApi,
	type MessageRenderData,
} from "./chat-session-projections";

export type ChatRuntimeActions = Pick<
	UseChatHelpers<BaseChatUIMessage>,
	"sendMessage" | "stop" | "resumeStream" | "setMessages"
>;

export type ChatToolActions = Pick<UseChatHelpers<BaseChatUIMessage>, "addToolOutput" | "addToolApprovalResponse">;

export type ChatSessionState = {
	messages: BaseChatUIMessage[];
	streamingMessage: BaseChatUIMessage | undefined;
	status: ChatStatus;
	error: Error | undefined;
	isChatInputVisible: boolean;
	runtimeActions: Partial<ChatRuntimeActions>;
	addToolOutput: ChatToolActions["addToolOutput"] | undefined;
	addToolApprovalResponse: ChatToolActions["addToolApprovalResponse"] | undefined;
	setRuntimeBindings: (bindings: {
		runtimeActions: Partial<ChatRuntimeActions>;
		addToolOutput: ChatToolActions["addToolOutput"] | undefined;
		addToolApprovalResponse: ChatToolActions["addToolApprovalResponse"] | undefined;
	}) => void;
	setChatInputVisible: (isVisible: boolean) => void;
	reset: (messages?: BaseChatUIMessage[]) => void;
};

type ChatSessionProviderProps = {
	children: ReactNode;
	initialMessages?: BaseChatUIMessage[];
	initialToolActions?: Partial<ChatToolActions>;
};

const createChatSessionSnapshot = (
	initialMessages: BaseChatUIMessage[] = [],
	initialToolActions: Partial<ChatToolActions> = {}
): Pick<
	ChatSessionState,
	| "messages"
	| "streamingMessage"
	| "status"
	| "error"
	| "isChatInputVisible"
	| "runtimeActions"
	| "addToolOutput"
	| "addToolApprovalResponse"
> => ({
	messages: initialMessages,
	streamingMessage: undefined,
	status: "ready",
	error: undefined,
	isChatInputVisible: true,
	runtimeActions: {},
	addToolOutput: initialToolActions.addToolOutput,
	addToolApprovalResponse: initialToolActions.addToolApprovalResponse,
});

const createChatSessionStore = (
	initialMessages: BaseChatUIMessage[] = [],
	initialToolActions: Partial<ChatToolActions> = {}
) => {
	const projections = createChatSessionProjectionApi();
	const store = createStore<ChatSessionState>()((set) => ({
		...createChatSessionSnapshot(initialMessages, initialToolActions),
		setRuntimeBindings: ({ runtimeActions, addToolOutput, addToolApprovalResponse }) => {
			set((state) => {
				const nextRuntimeActions = {
					...state.runtimeActions,
					...runtimeActions,
				};

				if (
					nextRuntimeActions.sendMessage === state.runtimeActions.sendMessage &&
					nextRuntimeActions.stop === state.runtimeActions.stop &&
					nextRuntimeActions.resumeStream === state.runtimeActions.resumeStream &&
					nextRuntimeActions.setMessages === state.runtimeActions.setMessages &&
					state.addToolOutput === addToolOutput &&
					state.addToolApprovalResponse === addToolApprovalResponse
				) {
					return state;
				}

				return {
					runtimeActions: nextRuntimeActions,
					addToolOutput,
					addToolApprovalResponse,
				};
			});
		},
		setChatInputVisible: (isChatInputVisible) => {
			set((state) => {
				if (state.isChatInputVisible === isChatInputVisible) {
					return state;
				}

				return {
					isChatInputVisible,
				};
			});
		},
		reset: (messages = []) => {
			set((state) => ({
				...createChatSessionSnapshot(messages),
				runtimeActions: state.runtimeActions,
				addToolOutput: state.addToolOutput,
				addToolApprovalResponse: state.addToolApprovalResponse,
			}));
		},
	}));

	store.subscribe((state, previousState) => {
		projections.invalidate(state, previousState);
	});

	return Object.assign(store, { projections });
};

export type ChatSessionStoreApi = StoreApi<ChatSessionState> & {
	projections: ChatSessionProjectionApi;
};

const ChatSessionStoreContext = createContext<ChatSessionStoreApi | null>(null);

export const ChatSessionProvider = ({
	children,
	initialMessages = [],
	initialToolActions = {},
}: ChatSessionProviderProps) => {
	const [store] = useState(() => createChatSessionStore(initialMessages, initialToolActions));

	return createElement(ChatSessionStoreContext.Provider, { value: store }, children);
};

export const useChatSessionStoreApi = (): ChatSessionStoreApi => {
	const store = useContext(ChatSessionStoreContext);

	if (store == null) {
		throw new Error("useChatSessionStoreApi must be used within ChatSessionProvider");
	}

	return store;
};

export const useChatSession = <T>(selector: (state: ChatSessionState) => T): T => {
	const store = useChatSessionStoreApi();

	return useStore(store, useShallow(selector));
};

export const useChatMessages = <TMessage extends BaseChatUIMessage = BaseChatUIMessage>() => {
	const store = useChatSessionStoreApi();
	const messages = useStore(store, (state) => state.messages);
	const streamingMessage = useStore(store, (state) => state.streamingMessage);

	return useMemo(
		() => (streamingMessage ? [...messages, streamingMessage] : messages) as TMessage[],
		[messages, streamingMessage]
	);
};

export const useMessageIds = () => {
	const store = useChatSessionStoreApi();
	return useStore(store, (state) => store.projections.getMessageIds(state));
};

export const useStreamingMessageId = () => {
	const store = useChatSessionStoreApi();
	return useStore(store, (state) => store.projections.getStreamingMessageId(state));
};

export const useMessageRoleById = (messageId: string) => {
	const store = useChatSessionStoreApi();
	return useStore(store, (state) => store.projections.getMessageRoleById(state, messageId));
};

export const useMessagePartTypesById = (messageId: string) => {
	const store = useChatSessionStoreApi();
	return useStore(store, (state) => store.projections.getMessagePartTypesById(state, messageId));
};

export const useMessageRenderDataById = (messageId: string): MessageRenderData => {
	const store = useChatSessionStoreApi();
	return useStore(store, (state) => store.projections.getMessageRenderDataById(state, messageId));
};

export function useMessagePartByPartIdx(messageId: string, partIdx: number): ChatMessagePart | undefined;
export function useMessagePartByPartIdx<T extends ChatMessagePartType>(
	messageId: string,
	partIdx: number,
	type: T
): Extract<ChatMessagePart, { type: T }> | undefined;
export function useMessagePartByPartIdx<T extends ChatMessagePartType>(messageId: string, partIdx: number, type?: T) {
	const store = useChatSessionStoreApi();
	const part = useStore(store, (state) => store.projections.getMessagePartByPartIdx(state, messageId, partIdx));

	if (!part) {
		return undefined;
	}

	if (type !== undefined && part.type !== type) {
		throw new Error(
			`Part type mismatch for id: ${messageId} at partIdx: ${partIdx}. Expected ${String(type)}, got ${String(part.type)}`
		);
	}

	return part as T extends ChatMessagePartType ? Extract<ChatMessagePart, { type: T }> : ChatMessagePart;
}
