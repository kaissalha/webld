"use client";

import { useEffect, useState } from "react";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { RequestIndicator } from "@/components/chat/chat-request-indicator";
import { useChatMessage } from "@/components/chat/stores/chat-session-store";
import type { BaseChatUIMessage } from "@webld/server";
import { Button } from "@webld/ui/components/button";
import { cn } from "@webld/ui/lib/utils";

import { MessageParts } from "./chat-message-parts";
import { buildMessageRenderData } from "./chat-message-render-data";

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
	const isUser = message.role === "user";
	const renderData = buildMessageRenderData(message);
	const showStreamingIndicator =
		isStreaming && message.role === "assistant" && !renderData.hasVisibleAssistantContent;
	const showCopyAction = !isStreaming && message.role === "assistant" && renderData.hasNonEmptyText;

	return (
		<MessageContainer isUser={isUser} className={className}>
			{showRequestIndicator ? <RequestIndicator /> : null}
			<MessageParts messageId={message.id} parts={message.parts} isUser={isUser} isStreaming={isStreaming} />
			{showStreamingIndicator ? <RequestIndicator /> : null}
			{showCopyAction ? <AssistantMessageActions copyableText={renderData.textContent} /> : null}
		</MessageContainer>
	);
};

export const ChatMessageById = ({
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
};

export const ChatMessage = ({
	message,
	className,
	showRequestIndicator = false,
}: {
	message: BaseChatUIMessage;
	className?: string;
	showRequestIndicator?: boolean;
}) => <MessageBody message={message} className={className} showRequestIndicator={showRequestIndicator} />;
