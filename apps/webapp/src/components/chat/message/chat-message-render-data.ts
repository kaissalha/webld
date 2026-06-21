import type { BaseChatUIMessage } from "@webld/server";

export type ChatMessagePart = BaseChatUIMessage["parts"][number];
export type ChatMessagePartType = ChatMessagePart["type"];

export type MessageRenderData = {
	textContent: string;
	hasNonEmptyText: boolean;
	hasVisibleAssistantContent: boolean;
};

const isVisibleAssistantPartType = (partType: ChatMessagePartType) =>
	partType === "text" ||
	partType === "reasoning" ||
	partType === "source-url" ||
	partType === "file" ||
	partType === "data-error" ||
	partType.startsWith("tool-");

export const buildMessageRenderData = (message: BaseChatUIMessage): MessageRenderData => {
	const textContent = message.parts
		.filter((part): part is Extract<ChatMessagePart, { type: "text" }> => part.type === "text")
		.map((part) => part.text)
		.join("\n");

	return {
		textContent,
		hasNonEmptyText: textContent.trim() !== "",
		hasVisibleAssistantContent: message.parts.some((part) => isVisibleAssistantPartType(part.type)),
	};
};
