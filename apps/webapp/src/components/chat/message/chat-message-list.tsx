"use client";

import { type CSSProperties, useEffect } from "react";

import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

import { ChatMessage, ChatMessageById } from "@/components/chat/message/chat-message";
import { useChatSession, useMessageIds, useStreamingMessageId } from "@/components/chat/stores/chat-session-store";
import { cn } from "@starter/ui/lib/utils";

type ChatMessageListProps = {
	className?: string;
	emptyState?: React.ReactNode;
};

export const ChatMessageList = ({ className, emptyState }: ChatMessageListProps) => {
	const hasMessages = useChatSession((state) => state.messages.length + (state.streamingMessage ? 1 : 0) > 0);

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

const MessageListContent = () => {
	const { scrollToBottom } = useStickToBottomContext();
	const messageIds = useMessageIds();
	const streamingMessageId = useStreamingMessageId();
	const { error, isLoading, isSubmitted, lastCommittedMessageRole } = useChatSession((state) => ({
		error: state.error,
		isLoading: state.status === "streaming" || state.status === "submitted",
		isSubmitted: state.status === "submitted",
		lastCommittedMessageRole: state.messages[state.messages.length - 1]?.role,
	}));

	useEffect(() => {
		if (messageIds.length > 0 || streamingMessageId) {
			scrollToBottom();
		}
	}, [messageIds.length, scrollToBottom, streamingMessageId]);

	const willShowSeparateIndicator =
		!streamingMessageId &&
		messageIds.length > 0 &&
		(isSubmitted || isLoading) &&
		lastCommittedMessageRole === "user";

	return (
		<div className='mx-auto h-fit w-full max-w-3xl overflow-x-hidden px-4 md:px-0'>
			{messageIds.map((messageId) => (
				<MessageRow key={messageId} messageId={messageId} isStreaming={false} />
			))}
			{streamingMessageId ? (
				<StreamingMessageRow
					messageId={streamingMessageId}
					className={!error ? "min-h-[calc(100dvh-280px)]" : ""}
				/>
			) : null}
			{willShowSeparateIndicator && (
				<ChatMessage
					key='request-indicator'
					message={{
						id: "request-indicator",
						role: "assistant",
						parts: [{ type: "text", text: "" }],
					}}
					showRequestIndicator={true}
					className='min-h-[calc(100dvh-280px)]'
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

const offscreenRowStyle: CSSProperties = {
	contentVisibility: "auto",
	containIntrinsicSize: "600px",
};

const MessageRow = ({
	messageId,
	isStreaming,
	className,
}: {
	messageId: string;
	isStreaming: boolean;
	className?: string;
}) => {
	return (
		<div className='w-full' style={isStreaming ? undefined : offscreenRowStyle}>
			<ChatMessageById messageId={messageId} isStreaming={isStreaming} className={className} />
		</div>
	);
};

const StreamingMessageRow = ({ messageId, className }: { messageId: string; className?: string }) => {
	return (
		<div className='w-full'>
			<ChatMessageById messageId={messageId} isStreaming={true} className={className} />
		</div>
	);
};

ChatMessageList.displayName = "ChatMessageList";
