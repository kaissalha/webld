"use client";

import { type CSSProperties, useEffect } from "react";

import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

import { ChatMessage, ChatMessageById } from "@/components/chat/message/chat-message";
import { useChatMessageIds, useChatSession } from "@/components/chat/stores/chat-session-store";
import { cn } from "@webld/ui/lib/utils";

type ChatMessageListProps = {
	className?: string;
	emptyState?: React.ReactNode;
};

const STREAMING_MIN_HEIGHT = "min-h-[calc(100dvh-280px)]";

export const ChatMessageList = ({ className, emptyState }: ChatMessageListProps) => {
	const hasMessages = useChatSession((state) => state.messages.length > 0);

	if (!hasMessages) {
		return (
			<div className='flex w-full flex-1 items-center justify-center'>
				{emptyState ?? <div className='mx-auto space-y-4 px-4 text-center' />}
			</div>
		);
	}

	return (
		<StickToBottom
			className={cn("flex-1 w-full overflow-auto no-scrollbar", className)}
			resize='smooth'
			initial='smooth'
			role='log'
		>
			<StickToBottom.Content scrollClassName='no-scrollbar'>
				<MessageListContent />
			</StickToBottom.Content>
		</StickToBottom>
	);
};

const offscreenRowStyle: CSSProperties = {
	contentVisibility: "auto",
	containIntrinsicSize: "600px",
};

const MessageListContent = () => {
	const { scrollToBottom } = useStickToBottomContext();
	const messageIds = useChatMessageIds();
	const { status, error, lastRole } = useChatSession((state) => ({
		status: state.status,
		error: state.error,
		lastRole: state.messages[state.messages.length - 1]?.role,
	}));

	const isLoading = status === "streaming" || status === "submitted";
	const lastMessageId = messageIds[messageIds.length - 1];
	const isAwaitingFirstToken = isLoading && lastRole === "user";

	useEffect(() => {
		if (messageIds.length > 0) {
			scrollToBottom();
		}
	}, [messageIds.length, scrollToBottom]);

	return (
		<div className='mx-auto h-fit w-full max-w-3xl overflow-x-hidden px-4 md:px-0'>
			{messageIds.map((messageId) => {
				const isStreaming = isLoading && lastRole === "assistant" && messageId === lastMessageId;

				return (
					<div key={messageId} className='w-full' style={isStreaming ? undefined : offscreenRowStyle}>
						<ChatMessageById
							messageId={messageId}
							isStreaming={isStreaming}
							className={isStreaming && !error ? STREAMING_MIN_HEIGHT : undefined}
						/>
					</div>
				);
			})}
			{isAwaitingFirstToken && (
				<ChatMessage
					message={{ id: "request-indicator", role: "assistant", parts: [{ type: "text", text: "" }] }}
					showRequestIndicator
					className={STREAMING_MIN_HEIGHT}
				/>
			)}
			{error && (
				<ChatMessage
					message={{
						id: error.message,
						role: "assistant",
						parts: [{ type: "data-error", data: { message: error.message } }],
					}}
				/>
			)}
			<div className='h-32' />
		</div>
	);
};

ChatMessageList.displayName = "ChatMessageList";
