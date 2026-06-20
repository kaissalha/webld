"use client";

import type React from "react";

import { LayoutGroup, motion } from "motion/react";

import type { ChatAttachmentErrorCode, ChatFileAttachment } from "@/components/chat/chat-attachments";
import { ChatComposer } from "@/components/chat/chat-input/chat-composer";
import { ChatMessageList } from "@/components/chat/message/chat-message-list";

export type ChatContentProps = {
	attachmentError?: ChatAttachmentErrorCode | null;
	attachments?: ChatFileAttachment[];
	canSubmit?: boolean;
	emptyState?: React.ReactNode;
	input: string;
	inputActions?: React.ReactNode;
	isLoading: boolean;
	isReadingAttachments?: boolean;
	onAttachmentError?: (error: ChatAttachmentErrorCode) => void;
	onFilesAdded?: (files: File[]) => Promise<void>;
	onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	onRemoveAttachment?: (id: string) => void;
	onStop?: () => void;
	onSubmit: (e?: React.FormEvent) => void;
	placeholder?: string;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

export const ChatContent = ({
	attachmentError,
	attachments,
	canSubmit,
	emptyState,
	input,
	inputActions,
	isLoading,
	isReadingAttachments,
	onAttachmentError,
	onFilesAdded,
	onInputChange,
	onRemoveAttachment,
	onStop,
	onSubmit,
	placeholder,
	textareaRef,
}: ChatContentProps) => {
	return (
		<div className='relative flex h-full w-full flex-col items-center overflow-hidden'>
			<LayoutGroup id='chat-content-input'>
				<ChatMessageList emptyState={emptyState} />
				<motion.div
					layoutId='chat-input'
					className='absolute inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4'
					variants={{
						hidden: { opacity: 0, y: 20 },
						visible: { opacity: 1, y: 0 },
					}}
					initial='hidden'
					animate='visible'
					transition={{ type: "spring", stiffness: 300, damping: 25 }}
				>
					<ChatComposer
						attachmentError={attachmentError}
						attachments={attachments}
						canSubmit={canSubmit}
						containerClassName='w-full max-w-3xl'
						input={input}
						inputActions={inputActions}
						isLoading={isLoading}
						isReadingAttachments={isReadingAttachments}
						onAttachmentError={onAttachmentError}
						onFilesAdded={onFilesAdded}
						onInputChange={onInputChange}
						onRemoveAttachment={onRemoveAttachment}
						onStop={onStop}
						onSubmit={onSubmit}
						placeholder={placeholder}
						textareaRef={textareaRef}
					/>
				</motion.div>
			</LayoutGroup>
			<div className='pointer-events-none absolute inset-x-0 bottom-0 z-30 h-30 bg-linear-to-t from-background to-transparent' />
		</div>
	);
};

ChatContent.displayName = "ChatContent";
