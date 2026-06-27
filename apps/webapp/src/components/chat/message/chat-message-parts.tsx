"use client";

import type { ReactNode } from "react";

import type { BaseChatUIMessage } from "@webld/server";

import { ChatSteps } from "./chat-steps";
import { ErrorPart } from "./parts/error-part";
import { FilePart } from "./parts/file-part";
import { ReasoningPart } from "./parts/reasoning-part";
import { SourcePart } from "./parts/source-part";
import { TextPart } from "./parts/text-part";
import { ToolPart } from "./parts/tool-part";

export type ChatMessagePart = BaseChatUIMessage["parts"][number];
export type ChatMessagePartType = ChatMessagePart["type"];

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

// Reasoning and tool calls are the "steps" of an assistant turn and render as a
// connected timeline. The composeEmail draft is an editable result, not a step.
const isStepPart = (part: ChatMessagePart) =>
	part.type === "reasoning" || (part.type.startsWith("tool-") && part.type !== "tool-composeEmail");

const renderMessagePart = ({
	part,
	partIdx,
	messageId,
	isUser,
	isStreamingText,
	isStreamingMessage,
	isLast = false,
}: {
	part: ChatMessagePart;
	partIdx: number;
	messageId: string;
	isUser: boolean;
	isStreamingText: boolean;
	isStreamingMessage: boolean;
	isLast?: boolean;
}) => {
	const key = `message-${messageId}-${part.type}-${partIdx}`;

	if (part.type === "text") {
		return (
			<TextPart key={key} text={part.text} isUser={isUser} isAssistant={!isUser} isStreaming={isStreamingText} />
		);
	}

	if (part.type === "reasoning") {
		return (
			<ReasoningPart
				key={key}
				text={part.text}
				state={part.state}
				isStreaming={isStreamingMessage}
				isLast={isLast}
			/>
		);
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
				isLast={isLast}
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
	const isStreamingMessage = isStreaming && !isUser;

	const elements: ReactNode[] = [];
	let stepBuffer: Array<{ part: ChatMessagePart; partIdx: number }> = [];

	const flushSteps = () => {
		if (stepBuffer.length === 0) {
			return;
		}

		const lastStepIndex = stepBuffer.length - 1;
		const stepNodes = stepBuffer.map(({ part, partIdx }, stepIndex) =>
			renderMessagePart({
				part,
				partIdx,
				messageId,
				isUser,
				isStreamingText: false,
				isStreamingMessage,
				isLast: stepIndex === lastStepIndex,
			})
		);

		elements.push(<ChatSteps key={`message-${messageId}-steps-${stepBuffer[0].partIdx}`}>{stepNodes}</ChatSteps>);
		stepBuffer = [];
	};

	parts.forEach((part, partIdx) => {
		// Step boundaries are invisible; skipping them keeps consecutive tool/reasoning
		// parts grouped into a single timeline.
		if (part.type === "step-start") {
			return;
		}

		if (isStepPart(part)) {
			stepBuffer.push({ part, partIdx });
			return;
		}

		flushSteps();
		elements.push(
			renderMessagePart({
				part,
				partIdx,
				messageId,
				isUser,
				isStreamingText: isStreamingMessage && partIdx === lastTextPartIndex,
				isStreamingMessage,
			})
		);
	});

	flushSteps();

	return elements;
};
