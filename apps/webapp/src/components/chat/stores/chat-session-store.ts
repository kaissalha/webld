"use client";

import { createContext, createElement, type ReactNode, useContext, useState } from "react";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatStatus } from "ai";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";
import { createStore, type StoreApi } from "zustand/vanilla";

import type { BaseChatUIMessage } from "@webld/server";

import { ChatSessionRuntime, type ChatSessionRuntimeConfig } from "./chat-session-runtime";

export type { ChatSessionRuntimeConfig };

export type ChatRuntimeActions = Pick<
	UseChatHelpers<BaseChatUIMessage>,
	"sendMessage" | "regenerate" | "resumeStream" | "setMessages" | "addToolOutput" | "addToolApprovalResponse"
> & {
	stop: () => void | Promise<void>;
};

export type ChatSessionState = {
	messages: BaseChatUIMessage[];
	status: ChatStatus;
	error: Error | undefined;
	actions: ChatRuntimeActions | undefined;
};

const ChatSessionStoreContext = createContext<StoreApi<ChatSessionState> | null>(null);

type ChatSessionProviderProps = {
	children: ReactNode;
	initialMessages?: BaseChatUIMessage[];
	runtime: ChatSessionRuntimeConfig;
};

const EMPTY_MESSAGES: BaseChatUIMessage[] = [];

export const ChatSessionProvider = ({
	children,
	initialMessages = EMPTY_MESSAGES,
	runtime,
}: ChatSessionProviderProps) => {
	const [store] = useState(() =>
		createStore<ChatSessionState>()(() => ({
			messages: initialMessages,
			status: "ready" as ChatStatus,
			error: undefined,
			actions: undefined,
		}))
	);

	return createElement(
		ChatSessionStoreContext.Provider,
		{ value: store },
		createElement(ChatSessionRuntime, { ...runtime, initialMessages, store }),
		children
	);
};

export const useChatSessionStoreApi = () => {
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

export const useChatMessageIds = () => {
	const store = useChatSessionStoreApi();

	return useStore(
		store,
		useShallow((state) => state.messages.map((message) => message.id))
	);
};

export const useChatMessage = (messageId: string) => {
	const store = useChatSessionStoreApi();

	return useStore(store, (state) => state.messages.find((message) => message.id === messageId));
};
