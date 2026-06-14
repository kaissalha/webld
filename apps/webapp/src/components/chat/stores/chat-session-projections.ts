"use client";

import type { BaseChatUIMessage } from "@webld/server";

export type ChatMessagePart = BaseChatUIMessage["parts"][number];
export type ChatMessagePartType = ChatMessagePart["type"];

export type ChatSessionProjectionState = {
	messages: BaseChatUIMessage[];
	streamingMessage: BaseChatUIMessage | undefined;
};

export type MessageRenderData = {
	flattenedParts: ChatMessagePart[];
	partTypes: ChatMessagePartType[];
	textContent: string;
	hasNonEmptyText: boolean;
	hasVisibleAssistantContent: boolean;
	hasReasoning: boolean;
};

type MessageProjection = MessageRenderData & {
	message: BaseChatUIMessage;
};

const EMPTY_MESSAGE_PARTS: ChatMessagePart[] = [];
const EMPTY_MESSAGE_PART_TYPES: ChatMessagePartType[] = [];
const EMPTY_MESSAGE_RENDER_DATA: MessageRenderData = {
	flattenedParts: EMPTY_MESSAGE_PARTS,
	partTypes: EMPTY_MESSAGE_PART_TYPES,
	textContent: "",
	hasNonEmptyText: false,
	hasVisibleAssistantContent: false,
	hasReasoning: false,
};

export const isVisibleAssistantPartType = (partType: ChatMessagePartType) => {
	return (
		partType === "text" ||
		partType === "reasoning" ||
		partType === "source-url" ||
		partType === "file" ||
		partType === "data-error" ||
		partType.startsWith("tool-")
	);
};

export const buildMessageRenderData = (message: BaseChatUIMessage): MessageRenderData => {
	const flattenedParts = message.parts;
	const partTypes = flattenedParts.map((part) => part.type);
	const textContent = flattenedParts
		.filter((part): part is Extract<ChatMessagePart, { type: "text" }> => part.type === "text")
		.map((part) => part.text)
		.join("\n");

	return {
		flattenedParts,
		partTypes,
		textContent,
		hasNonEmptyText: textContent.trim() !== "",
		hasVisibleAssistantContent: partTypes.some((partType) => isVisibleAssistantPartType(partType)),
		hasReasoning: partTypes.some((partType) => partType === "reasoning"),
	};
};

export type ChatSessionProjectionApi = {
	getMessageIds: (state: ChatSessionProjectionState) => string[];
	getStreamingMessageId: (state: ChatSessionProjectionState) => string | undefined;
	getMessageRoleById: (state: ChatSessionProjectionState, messageId: string) => BaseChatUIMessage["role"] | undefined;
	getMessagePartTypesById: (state: ChatSessionProjectionState, messageId: string) => ChatMessagePartType[];
	getMessagePartByPartIdx: (
		state: ChatSessionProjectionState,
		messageId: string,
		partIdx: number
	) => ChatMessagePart | undefined;
	getMessageRenderDataById: (state: ChatSessionProjectionState, messageId: string) => MessageRenderData;
	invalidate: (state: ChatSessionProjectionState, previousState: ChatSessionProjectionState) => void;
};

export const createChatSessionProjectionApi = (): ChatSessionProjectionApi => {
	let committedMessageIds: string[] | null = null;
	let committedMessageIndex: Map<string, BaseChatUIMessage> | null = null;
	const messageProjectionCache = new Map<string, MessageProjection>();

	const ensureCommittedMessageIds = (state: ChatSessionProjectionState) => {
		if (committedMessageIds == null) {
			committedMessageIds = state.messages.map((message) => message.id);
		}

		return committedMessageIds;
	};

	const ensureCommittedMessageIndex = (state: ChatSessionProjectionState) => {
		if (committedMessageIndex == null) {
			committedMessageIndex = new Map(state.messages.map((message) => [message.id, message]));
		}

		return committedMessageIndex;
	};

	const getCurrentMessage = (state: ChatSessionProjectionState, messageId: string) => {
		if (state.streamingMessage?.id === messageId) {
			return state.streamingMessage;
		}

		return ensureCommittedMessageIndex(state).get(messageId);
	};

	const ensureMessageProjection = (state: ChatSessionProjectionState, messageId: string) => {
		const message = getCurrentMessage(state, messageId);

		if (!message) {
			return undefined;
		}

		const cachedProjection = messageProjectionCache.get(messageId);
		if (cachedProjection?.message === message) {
			return cachedProjection;
		}

		const nextProjection = {
			message,
			...buildMessageRenderData(message),
		};
		messageProjectionCache.set(messageId, nextProjection);
		return nextProjection;
	};

	return {
		getMessageIds: (state) => ensureCommittedMessageIds(state),
		getStreamingMessageId: (state) => state.streamingMessage?.id,
		getMessageRoleById: (state, messageId) => getCurrentMessage(state, messageId)?.role,
		getMessagePartTypesById: (state, messageId) =>
			ensureMessageProjection(state, messageId)?.partTypes ?? EMPTY_MESSAGE_PART_TYPES,
		getMessagePartByPartIdx: (state, messageId, partIdx) =>
			ensureMessageProjection(state, messageId)?.flattenedParts[partIdx],
		getMessageRenderDataById: (state, messageId) =>
			ensureMessageProjection(state, messageId) ?? EMPTY_MESSAGE_RENDER_DATA,
		invalidate: (state, previousState) => {
			if (state.messages !== previousState.messages) {
				committedMessageIds = null;
				committedMessageIndex = null;
			}

			if (
				state.messages === previousState.messages &&
				state.streamingMessage === previousState.streamingMessage
			) {
				return;
			}

			const currentMessages = new Map(state.messages.map((message) => [message.id, message]));
			if (state.streamingMessage) {
				currentMessages.set(state.streamingMessage.id, state.streamingMessage);
			}

			for (const [messageId, projection] of messageProjectionCache) {
				if (currentMessages.get(messageId) !== projection.message) {
					messageProjectionCache.delete(messageId);
				}
			}
		},
	};
};
