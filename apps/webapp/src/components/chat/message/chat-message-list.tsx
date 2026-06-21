"use client";

import { type CSSProperties } from "react";

import { StickToBottom } from "use-stick-to-bottom";

import { RequestIndicator } from "@/components/chat/chat-request-indicator";
import { ChatMessage, ChatMessageById } from "@/components/chat/message/chat-message";
import { useChatMessageIds, useChatSession } from "@/components/chat/stores/chat-session-store";
import { cn } from "@webld/ui/lib/utils";

type ChatMessageListProps = {
	className?: string;
	emptyState?: React.ReactNode;
};

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
			className={cn("relative min-h-0 flex-1 overflow-y-hidden", className)}
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
	containIntrinsicSize: "0 120px",
};

const MessageListContent = () => {
	const messageIds = useChatMessageIds();
	const { status, error, lastRole } = useChatSession((state) => ({
		status: state.status,
		error: state.error,
		lastRole: state.messages[state.messages.length - 1]?.role,
	}));

	const isLoading = status === "streaming" || status === "submitted";
	const lastMessageId = messageIds[messageIds.length - 1];
	const isAwaitingFirstToken = isLoading && lastRole === "user";

	return (
		<div className='mx-auto h-fit w-full max-w-3xl overflow-x-hidden px-4 pb-32 md:px-0'>
			{messageIds.map((messageId) => {
				const isStreaming = isLoading && lastRole === "assistant" && messageId === lastMessageId;

				return (
					<div key={messageId} className='w-full' style={offscreenRowStyle}>
						<ChatMessageById messageId={messageId} isStreaming={isStreaming} />
					</div>
				);
			})}
			{isAwaitingFirstToken && (
				<div className='flex w-full items-start py-5'>
					<RequestIndicator />
				</div>
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
		</div>
	);
};

ChatMessageList.displayName = "ChatMessageList";
