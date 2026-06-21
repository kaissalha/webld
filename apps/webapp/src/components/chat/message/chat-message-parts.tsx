"use client";

import type { BaseChatUIMessage } from "@webld/server";

import type { ChatMessagePart } from "./chat-message-render-data";
import { ErrorPart } from "./parts/error-part";
import { FilePart } from "./parts/file-part";
import { ReasoningPart } from "./parts/reasoning-part";
import { SourcePart } from "./parts/source-part";
import { TextPart } from "./parts/text-part";
import { ToolPart } from "./parts/tool-part";

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

type MessagePartsProps = {
	messageId: string;
	parts: BaseChatUIMessage["parts"];
	isUser: boolean;
	isStreaming: boolean;
};

const getLastTextPartIndex = (parts: BaseChatUIMessage["parts"]) => {
	for (let index = parts.length - 1; index >= 0; index -= 1) {
		if (parts[index].type === "text") {
			return index;
		}
	}

	return -1;
};

const renderMessagePart = ({
	part,
	partIdx,
	messageId,
	isUser,
	isStreamingText,
}: {
	part: ChatMessagePart;
	partIdx: number;
	messageId: string;
	isUser: boolean;
	isStreamingText: boolean;
}) => {
	const key = `message-${messageId}-${part.type}-${partIdx}`;

	if (part.type === "text") {
		return (
			<TextPart key={key} text={part.text} isUser={isUser} isAssistant={!isUser} isStreaming={isStreamingText} />
		);
	}

	if (part.type === "reasoning") {
		return <ReasoningPart key={key} text={part.text} isStreaming={isStreamingText} />;
	}

	if (part.type === "source-url") {
		return <SourcePart key={key} url={part.url} title={part.title} />;
	}

	if (part.type === "file") {
		return <FilePart key={key} url={part.url} mediaType={part.mediaType} filename={part.filename} />;
	}

	if (part.type === "data-attachment") {
		const attachmentPart = part as unknown as AttachmentDataPart;

		return (
			<FilePart
				key={key}
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
				key={key}
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
		return <ErrorPart key={key} message={part.data.message} />;
	}

	return null;
};

export const MessageParts = ({ messageId, parts, isUser, isStreaming }: MessagePartsProps) => {
	const lastTextPartIndex = getLastTextPartIndex(parts);

	return parts.map((part, partIdx) =>
		renderMessagePart({
			part,
			partIdx,
			messageId,
			isUser,
			isStreamingText: isStreaming && !isUser && partIdx === lastTextPartIndex,
		})
	);
};
