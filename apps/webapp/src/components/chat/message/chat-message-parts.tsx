"use client";

import { type ReactNode, useMemo } from "react";

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

const isStepPart = (part: ChatMessagePart) =>
	part.type === "reasoning" || (part.type.startsWith("tool-") && part.type !== "tool-composeEmail");

type StepBufferItem = { part: ChatMessagePart; partIdx: number };

const buildMessagePartElements = ({
	parts,
	messageId,
	isUser,
	isStreamingMessage,
	lastTextPartIndex,
}: {
	parts: BaseChatUIMessage["parts"];
	messageId: string;
	isUser: boolean;
	isStreamingMessage: boolean;
	lastTextPartIndex: number;
}) => {
	const renderStepGroup = (stepBuffer: StepBufferItem[]) => {
		const lastStepIndex = stepBuffer.length - 1;

		return (
			<ChatSteps key={`message-${messageId}-steps-${stepBuffer[0].partIdx}`}>
				{stepBuffer.map(({ part, partIdx }, stepIndex) =>
					renderMessagePart({
						part,
						partIdx,
						messageId,
						isUser,
						isStreamingText: false,
						isStreamingMessage,
						isLast: stepIndex === lastStepIndex,
					})
				)}
			</ChatSteps>
		);
	};

	return parts.reduce<{ elements: ReactNode[]; stepBuffer: StepBufferItem[] }>(
		(acc, part, partIdx) => {
			if (part.type === "step-start") {
				return acc;
			}

			if (isStepPart(part)) {
				return {
					...acc,
					stepBuffer: [...acc.stepBuffer, { part, partIdx }],
				};
			}

			const flushedElements =
				acc.stepBuffer.length > 0 ? [...acc.elements, renderStepGroup(acc.stepBuffer)] : acc.elements;

			return {
				elements: [
					...flushedElements,
					renderMessagePart({
						part,
						partIdx,
						messageId,
						isUser,
						isStreamingText: isStreamingMessage && partIdx === lastTextPartIndex,
						isStreamingMessage,
					}),
				],
				stepBuffer: [],
			};
		},
		{ elements: [], stepBuffer: [] }
	);
};

const renderTrailingStepGroup = ({
	stepBuffer,
	messageId,
	isUser,
	isStreamingMessage,
}: {
	stepBuffer: StepBufferItem[];
	messageId: string;
	isUser: boolean;
	isStreamingMessage: boolean;
}) => {
	const lastStepIndex = stepBuffer.length - 1;

	return (
		<ChatSteps key={`message-${messageId}-steps-${stepBuffer[0].partIdx}`}>
			{stepBuffer.map(({ part, partIdx }, stepIndex) =>
				renderMessagePart({
					part,
					partIdx,
					messageId,
					isUser,
					isStreamingText: false,
					isStreamingMessage,
					isLast: stepIndex === lastStepIndex,
				})
			)}
		</ChatSteps>
	);
};

export const MessageParts = ({ messageId, parts, isUser, isStreaming }: MessagePartsProps) => {
	const isStreamingMessage = isStreaming && !isUser;
	const lastTextPartIndex = parts.findLastIndex((part) => part.type === "text");

	const elements = useMemo(() => {
		const { elements: renderedElements, stepBuffer } = buildMessagePartElements({
			parts,
			messageId,
			isUser,
			isStreamingMessage,
			lastTextPartIndex,
		});

		return stepBuffer.length > 0
			? [...renderedElements, renderTrailingStepGroup({ stepBuffer, messageId, isUser, isStreamingMessage })]
			: renderedElements;
	}, [isStreamingMessage, isUser, lastTextPartIndex, messageId, parts]);

	return elements;
};
