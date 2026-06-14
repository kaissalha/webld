"use client";

import { memo, useCallback, useEffect, useState } from "react";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { RequestIndicator } from "@/components/chat/chat-request-indicator";
import { buildMessageRenderData } from "@/components/chat/stores/chat-session-projections";
import {
	useMessagePartTypesById,
	useMessageRenderDataById,
	useMessageRoleById,
} from "@/components/chat/stores/chat-session-store";
import type { BaseChatUIMessage } from "@starter/server";
import { Button } from "@starter/ui/components/button";
import { cn } from "@starter/ui/lib/utils";

import { MessagePartsById, StaticMessageParts } from "./chat-message-parts";

type PureMessageProps<TMessage extends BaseChatUIMessage = BaseChatUIMessage> = {
	message: TMessage;
	className?: string;
	showRequestIndicator?: boolean;
	isStreaming?: boolean;
};

type ChatMessageByIdProps = {
	messageId: string;
	className?: string;
	showRequestIndicator?: boolean;
	isStreaming?: boolean;
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

const AssistantMessageActions = memo(function AssistantMessageActions({ copyableText }: { copyableText: string }) {
	const t = useTranslations("components.chat.message");
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(copyableText);
			setCopied(true);
		} catch {
			setCopied(false);
		}
	}, [copyableText]);

	useEffect(() => {
		if (!copied) {
			return undefined;
		}

		const timeoutId = window.setTimeout(() => {
			setCopied(false);
		}, 2000);

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
});

const PureMessageById = ({
	messageId,
	className,
	showRequestIndicator = false,
	isStreaming = false,
}: ChatMessageByIdProps) => {
	const role = useMessageRoleById(messageId);
	const partTypes = useMessagePartTypesById(messageId);
	const renderData = useMessageRenderDataById(messageId);

	if (!role) {
		return null;
	}

	const shouldShowStreamingIndicator = isStreaming && role === "assistant" && !renderData.hasVisibleAssistantContent;
	const shouldShowCopyAction = !isStreaming && role === "assistant" && renderData.hasNonEmptyText;

	return (
		<MessageContainer isUser={role === "user"} className={className}>
			{showRequestIndicator ? <RequestIndicator /> : null}
			<MessagePartsById
				messageId={messageId}
				partTypes={partTypes}
				isUser={role === "user"}
				isStreaming={isStreaming}
			/>
			{shouldShowStreamingIndicator ? <RequestIndicator /> : null}
			{shouldShowCopyAction ? <AssistantMessageActions copyableText={renderData.textContent} /> : null}
		</MessageContainer>
	);
};

export const ChatMessageById = memo(PureMessageById, (previousProps, nextProps) => {
	return (
		previousProps.messageId === nextProps.messageId &&
		previousProps.className === nextProps.className &&
		previousProps.showRequestIndicator === nextProps.showRequestIndicator &&
		previousProps.isStreaming === nextProps.isStreaming
	);
});

export const PureMessage = <TMessage extends BaseChatUIMessage = BaseChatUIMessage>({
	message,
	className,
	showRequestIndicator = false,
	isStreaming = false,
}: PureMessageProps<TMessage>) => {
	const isUser = message.role === "user";
	const renderData = buildMessageRenderData(message);
	const shouldShowStreamingIndicator =
		isStreaming && message.role === "assistant" && !renderData.hasVisibleAssistantContent;
	const shouldShowCopyAction = !isStreaming && message.role === "assistant" && renderData.hasNonEmptyText;

	return (
		<MessageContainer isUser={isUser} className={className}>
			{showRequestIndicator ? <RequestIndicator /> : null}
			<StaticMessageParts
				messageId={message.id}
				parts={message.parts}
				isUser={isUser}
				isStreaming={isStreaming}
			/>
			{shouldShowStreamingIndicator ? <RequestIndicator /> : null}
			{shouldShowCopyAction ? <AssistantMessageActions copyableText={renderData.textContent} /> : null}
		</MessageContainer>
	);
};

export const ChatMessage = memo(PureMessage);

AssistantMessageActions.displayName = "AssistantMessageActions";
ChatMessage.displayName = "ChatMessage";
ChatMessageById.displayName = "ChatMessageById";
