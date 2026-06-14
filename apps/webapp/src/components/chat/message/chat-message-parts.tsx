"use client";

import { memo } from "react";

import type { ChatMessagePartType } from "@/components/chat/stores/chat-session-projections";
import { useMessagePartByPartIdx } from "@/components/chat/stores/chat-session-store";
import type { BaseChatUIMessage } from "@starter/server";

import { ErrorPart } from "./parts/error-part";
import { FilePart } from "./parts/file-part";
import { ReasoningPart } from "./parts/reasoning-part";
import { SourcePart } from "./parts/source-part";
import { TextPart } from "./parts/text-part";
import { ToolPart } from "./parts/tool-part";

type ChatMessagePart = BaseChatUIMessage["parts"][number];
type AttachmentDataPart = {
	type: "data-attachment";
	data: {
		filename: string;
		mediaType: string;
	};
};
type ToolMessagePart = Extract<ChatMessagePart, { type: `tool-${string}` }> & {
	toolCallId: string;
	state: "input-streaming" | "input-available" | "output-available" | "output-error";
	input?: Record<string, unknown>;
	output?: unknown;
	errorText?: string;
};

type BaseMessagePartProps = {
	part: ChatMessagePart;
	partIdx: number;
	messageId: string;
	isUser: boolean;
	isAssistant: boolean;
	isStreamingText: boolean;
};

type MessagePartsByIdProps = {
	messageId: string;
	partTypes: ChatMessagePartType[];
	isUser: boolean;
	isStreaming: boolean;
};

type StaticMessagePartsProps = Omit<MessagePartsByIdProps, "partTypes"> & {
	parts: ChatMessagePart[];
};

const renderMessagePart = ({
	part,
	partIdx,
	messageId,
	isUser,
	isAssistant,
	isStreamingText,
}: BaseMessagePartProps) => {
	if (part.type === "text") {
		return (
			<TextPart
				key={`message-${messageId}-text-${partIdx}`}
				text={part.text}
				messageId={messageId}
				isUser={isUser}
				isAssistant={isAssistant}
				isStreaming={isStreamingText}
			/>
		);
	}

	if (part.type === "reasoning") {
		return (
			<ReasoningPart
				key={`message-${messageId}-reasoning-${partIdx}`}
				text={part.text}
				isStreaming={isStreamingText}
			/>
		);
	}

	if (part.type === "source-url") {
		return <SourcePart key={`message-${messageId}-source-${partIdx}`} url={part.url} title={part.title} />;
	}

	if (part.type === "file") {
		return (
			<FilePart
				key={`message-${messageId}-file-${partIdx}`}
				url={part.url}
				mediaType={part.mediaType}
				filename={part.filename}
			/>
		);
	}

	if (part.type === "data-attachment") {
		const attachmentPart = part as unknown as AttachmentDataPart;

		return (
			<FilePart
				key={`message-${messageId}-attachment-${partIdx}`}
				url=''
				mediaType={attachmentPart.data.mediaType}
				filename={attachmentPart.data.filename}
			/>
		);
	}

	if (part.type.startsWith("tool-")) {
		const toolPart = part as ToolMessagePart;
		return (
			<ToolPart
				key={`message-${messageId}-tool-${partIdx}`}
				toolName={part.type.slice("tool-".length) || "unknown"}
				toolCallId={toolPart.toolCallId}
				state={toolPart.state}
				input={toolPart.input}
				output={toolPart.output}
				errorText={toolPart.errorText}
			/>
		);
	}

	if (part.type === "data-error") {
		return (
			<ErrorPart
				key={`message-${messageId}-error-${partIdx}`}
				message={part.data.message}
				messageId={messageId}
			/>
		);
	}

	return null;
};

const StaticMessagePart = memo(function StaticMessagePart(props: BaseMessagePartProps) {
	return renderMessagePart(props);
});

const MessagePartById = memo(function MessagePartById({
	messageId,
	partIdx,
	isUser,
	isAssistant,
	isStreamingText,
}: Omit<BaseMessagePartProps, "part">) {
	const part = useMessagePartByPartIdx(messageId, partIdx);

	if (!part) {
		return null;
	}

	return renderMessagePart({
		part,
		partIdx,
		messageId,
		isUser,
		isAssistant,
		isStreamingText,
	});
});

const getLastTextPartIndex = (partTypes: ChatMessagePartType[]) => {
	for (let index = partTypes.length - 1; index >= 0; index -= 1) {
		if (partTypes[index] === "text") {
			return index;
		}
	}

	return -1;
};

export const MessagePartsById = memo(function MessagePartsById({
	messageId,
	partTypes,
	isUser,
	isStreaming,
}: MessagePartsByIdProps) {
	const lastTextPartIndex = getLastTextPartIndex(partTypes);
	const isAssistant = !isUser;

	return partTypes.map((partType, partIdx) => (
		<MessagePartById
			key={`message-${messageId}-${partType}-${partIdx}`}
			messageId={messageId}
			partIdx={partIdx}
			isUser={isUser}
			isAssistant={isAssistant}
			isStreamingText={isStreaming && isAssistant && partIdx === lastTextPartIndex}
		/>
	));
});

export const StaticMessageParts = memo(function StaticMessageParts({
	messageId,
	parts,
	isUser,
	isStreaming,
}: StaticMessagePartsProps) {
	const partTypes = parts.map((part) => part.type);
	const lastTextPartIndex = getLastTextPartIndex(partTypes);
	const isAssistant = !isUser;

	return parts.map((part, partIdx) => (
		<StaticMessagePart
			key={`message-${messageId}-${part.type}-${partIdx}`}
			part={part}
			partIdx={partIdx}
			messageId={messageId}
			isUser={isUser}
			isAssistant={isAssistant}
			isStreamingText={isStreaming && isAssistant && partIdx === lastTextPartIndex}
		/>
	));
});

MessagePartById.displayName = "MessagePartById";
MessagePartsById.displayName = "MessagePartsById";
StaticMessagePart.displayName = "StaticMessagePart";
StaticMessageParts.displayName = "StaticMessageParts";
