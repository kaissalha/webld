"use client";

import { useEffect, type ReactNode } from "react";

import { ChatContent } from "@/components/chat/chat-content";
import { useChatState } from "@/hooks/chat/use-chat-state";

export type ChatInterfaceProps = {
	/** Additional elements to render in input area (e.g., ScribeButton) */
	inputActions?: ReactNode;
	/** Empty state content when no messages */
	emptyState?: ReactNode;
	/** Custom placeholder text */
	placeholder?: string;
};

export const ChatInterface = ({ inputActions, emptyState, placeholder }: ChatInterfaceProps) => {
	const chatState = useChatState();

	useEffect(() => {
		chatState.textareaRef.current?.focus();
	}, [chatState.textareaRef]);

	return (
		<ChatContent
			attachmentError={chatState.attachmentError}
			attachments={chatState.attachments}
			canSubmit={chatState.canSubmit}
			input={chatState.input}
			onAttachmentError={chatState.handleFilesRejected}
			onFilesAdded={chatState.handleFilesAdded}
			onInputChange={chatState.handleInputChange}
			onSubmit={chatState.handleSubmit}
			onRemoveAttachment={chatState.removeAttachment}
			isLoading={chatState.isLoading}
			isReadingAttachments={chatState.isReadingAttachments}
			onStop={chatState.stop}
			textareaRef={chatState.textareaRef}
			placeholder={placeholder}
			inputActions={inputActions}
			emptyState={emptyState}
		/>
	);
};
