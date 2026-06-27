"use client";

import { memo, useEffect, useMemo, useState } from "react";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { ChatStatusIndicator, RequestIndicator } from "@/components/chat/chat-request-indicator";
import { useChatMessage } from "@/components/chat/stores/chat-session-store";
import type { BaseChatUIMessage } from "@webld/server";
import { Button } from "@webld/ui/components/button";
import { cn } from "@webld/ui/lib/utils";

import { MessageParts, type ChatMessagePart, type ChatMessagePartType } from "./chat-message-parts";

type MessageRenderData = {
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

const buildMessageRenderData = (message: BaseChatUIMessage): MessageRenderData => {
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

// Show a "Thinking…" status only in the gaps where nothing else conveys activity:
// not while the answer text streams, and not while a tool/reasoning part already
// renders its own loader.
const shouldShowThinkingIndicator = ({
	message,
	isStreaming,
}: {
	message: BaseChatUIMessage;
	isStreaming: boolean;
}) => {
	if (!isStreaming || message.role !== "assistant") {
		return false;
	}

	const lastPart = message.parts.at(-1);
	if (!lastPart) {
		return true;
	}
	if (lastPart.type === "text") {
		return false;
	}
	if (lastPart.type === "reasoning") {
		return lastPart.state !== "streaming";
	}
	if (lastPart.type.startsWith("tool-")) {
		const toolState = (lastPart as { state?: string }).state;
		return toolState === "output-available" || toolState === "output-error";
	}

	return true;
};

const MessageContainer = ({
	isUser,
	className,
	children,
}: {
	isUser: boolean;
	className?: string;
	children: React.ReactNode;
}) => (
	<div
		className={cn(
			"flex w-full max-w-full flex-col gap-3 overflow-hidden py-5",
			isUser ? "items-end" : "items-start",
			className
		)}
	>
		{children}
	</div>
);

const AssistantMessageActions = ({ copyableText }: { copyableText: string }) => {
	const t = useTranslations("components.chat.message");
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(copyableText);
			setCopied(true);
		} catch {
			setCopied(false);
		}
	};

	useEffect(() => {
		if (!copied) {
			return undefined;
		}

		const timeoutId = window.setTimeout(() => setCopied(false), 2000);

		return () => window.clearTimeout(timeoutId);
	}, [copied]);

	return (
		<div className='flex items-center gap-2 px-1 transition-opacity md:opacity-0 md:group-hover:opacity-100'>
			<Button
				variant={copied ? "secondary" : "ghost"}
				size='icon'
				onClick={handleCopy}
				aria-label={copied ? t("copiedToClipboard") : t("copyToClipboard")}
				title={copied ? t("copiedToClipboard") : t("copyToClipboard")}
			>
				{copied ? <CheckIcon className='size-4' /> : <CopyIcon className='size-4' />}
			</Button>
		</div>
	);
};

const MessageBody = ({
	message,
	className,
	showRequestIndicator = false,
	isStreaming = false,
}: {
	message: BaseChatUIMessage;
	className?: string;
	showRequestIndicator?: boolean;
	isStreaming?: boolean;
}) => {
	const t = useTranslations("components.chat.message");
	const isUser = message.role === "user";
	const renderData = useMemo(() => buildMessageRenderData(message), [message]);
	const showThinkingIndicator = shouldShowThinkingIndicator({ message, isStreaming });
	const showCopyAction = !isStreaming && message.role === "assistant" && renderData.hasNonEmptyText;

	return (
		<MessageContainer isUser={isUser} className={className}>
			{showRequestIndicator ? <RequestIndicator /> : null}
			<MessageParts messageId={message.id} parts={message.parts} isUser={isUser} isStreaming={isStreaming} />
			{showThinkingIndicator ? <ChatStatusIndicator label={t("status.thinking")} /> : null}
			{showCopyAction ? <AssistantMessageActions copyableText={renderData.textContent} /> : null}
		</MessageContainer>
	);
};

export const ChatMessageById = memo(
	({
		messageId,
		className,
		isStreaming = false,
	}: {
		messageId: string;
		className?: string;
		isStreaming?: boolean;
	}) => {
		const message = useChatMessage(messageId);

		if (!message) {
			return null;
		}

		return <MessageBody message={message} className={className} isStreaming={isStreaming} />;
	}
);

ChatMessageById.displayName = "ChatMessageById";

export const ChatMessage = ({
	message,
	className,
	showRequestIndicator = false,
}: {
	message: BaseChatUIMessage;
	className?: string;
	showRequestIndicator?: boolean;
}) => <MessageBody message={message} className={className} showRequestIndicator={showRequestIndicator} />;
