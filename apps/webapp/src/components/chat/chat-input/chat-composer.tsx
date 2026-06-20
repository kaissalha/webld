"use client";

import type React from "react";
import { useCallback, useRef, useState } from "react";

import { useTranslations } from "next-intl";

import {
	CHAT_ATTACHMENT_MAX_FILES,
	CHAT_ATTACHMENT_MAX_SIZE_BYTES,
	type ChatAttachmentErrorCode,
	type ChatFileAttachment,
} from "@/components/chat/chat-attachments";
import { ChatAttachmentTile } from "@/components/chat/chat-input/chat-attachment-tile";
import {
	ChatInput,
	ChatInputAttachments,
	ChatInputBody,
	ChatInputControls,
	ChatInputSubmit,
	ChatInputTextArea,
} from "@/components/chat/chat-input/chat-input";
import { ChatPlusMenu } from "@/components/chat/chat-input/chat-plus-menu";
import { useChatDropHandlers } from "@/components/chat/use-chat-drop-handlers";

export type ChatComposerProps = {
	accept?: string;
	attachmentError?: ChatAttachmentErrorCode | null;
	attachments?: ChatFileAttachment[];
	canSubmit?: boolean;
	className?: string;
	containerClassName?: string;
	input: string;
	inputActions?: React.ReactNode;
	isDisabled?: boolean;
	isLoading?: boolean;
	isReadingAttachments?: boolean;
	onAttachmentError?: (error: ChatAttachmentErrorCode) => void;
	onFilesAdded?: (files: File[]) => Promise<void> | void;
	onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	onRemoveAttachment?: (id: string) => void;
	onStop?: () => void;
	onSubmit: (e?: React.FormEvent) => void;
	placeholder?: string;
	textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
};

export const ChatComposer = ({
	accept,
	attachmentError,
	attachments,
	canSubmit,
	className,
	containerClassName,
	input,
	inputActions,
	isDisabled = false,
	isLoading = false,
	isReadingAttachments = false,
	onAttachmentError,
	onFilesAdded,
	onInputChange,
	onRemoveAttachment,
	onStop,
	onSubmit,
	placeholder,
	textareaRef,
}: ChatComposerProps) => {
	const tChats = useTranslations("chats");
	const inputT = useTranslations("components.chat.input");
	const fileInputRef = useRef<HTMLInputElement>(null);
	const fallbackTextareaRef = useRef<HTMLTextAreaElement>(null);
	const resolvedTextareaRef = textareaRef ?? fallbackTextareaRef;
	const resolvedAttachments = attachments ?? [];
	const [plusMenuOpen, setPlusMenuOpen] = useState(false);

	const canAttachFiles = Boolean(onFilesAdded);
	const attachmentSlotsRemaining = Math.max(CHAT_ATTACHMENT_MAX_FILES - resolvedAttachments.length, 0);
	const isAttachDisabled =
		isLoading || isReadingAttachments || isDisabled || !canAttachFiles || attachmentSlotsRemaining === 0;

	const handleFiles = useCallback(
		(files: File[]) => {
			if (!onFilesAdded) {
				return;
			}

			const tooLarge = files.filter((file) => file.size > CHAT_ATTACHMENT_MAX_SIZE_BYTES);
			if (tooLarge.length > 0 && tooLarge.length === files.length) {
				onAttachmentError?.("too-large");
				return;
			}

			void onFilesAdded(files);
		},
		[onAttachmentError, onFilesAdded]
	);

	const { handleDragOver, handleDrop } = useChatDropHandlers({
		disabled: isAttachDisabled,
		onFiles: handleFiles,
	});

	const handleFileInputChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const files = event.target.files ? Array.from(event.target.files) : [];
			event.target.value = "";

			if (files.length > 0) {
				handleFiles(files);
			}
		},
		[handleFiles]
	);

	const resolvedCanSubmit = canSubmit ?? (Boolean(input.trim()) || resolvedAttachments.length > 0);

	return (
		<div
			className={containerClassName}
			onDragOver={canAttachFiles ? handleDragOver : undefined}
			onDrop={canAttachFiles ? handleDrop : undefined}
		>
			{canAttachFiles && (
				<input
					accept={accept}
					aria-hidden
					className='hidden'
					multiple
					onChange={handleFileInputChange}
					ref={fileInputRef}
					tabIndex={-1}
					type='file'
				/>
			)}
			<ChatInput
				canSubmit={resolvedCanSubmit}
				className={className}
				disabled={isDisabled || isReadingAttachments}
				loading={isLoading}
				onChange={onInputChange}
				onStop={onStop}
				onSubmit={onSubmit}
				textareaRef={resolvedTextareaRef}
				value={input}
			>
				{resolvedAttachments.length > 0 && (
					<ChatInputAttachments>
						{resolvedAttachments.map((attachment) => (
							<ChatAttachmentTile
								attachment={attachment}
								key={attachment.id}
								onRemove={(id) => onRemoveAttachment?.(id)}
							/>
						))}
					</ChatInputAttachments>
				)}
				{attachmentError && (
					<p className='px-4 pb-1 text-destructive text-xs'>
						{inputT(
							(
								{
									"too-large": "fileTooLarge",
									"too-many": "tooManyFiles",
									"unsupported-type": "unsupportedFileType",
									"upload-failed": "fileUploadFailed",
									"read-failed": "fileReadFailed",
								} as const
							)[attachmentError],
							{
								count: CHAT_ATTACHMENT_MAX_FILES,
								size:
									CHAT_ATTACHMENT_MAX_SIZE_BYTES < 1024 * 1024
										? `${Math.max(1, Math.round(CHAT_ATTACHMENT_MAX_SIZE_BYTES / 1024))} KB`
										: `${Math.round(CHAT_ATTACHMENT_MAX_SIZE_BYTES / (1024 * 1024))} MB`,
							}
						)}
					</p>
				)}
				<ChatInputBody>
					<ChatInputTextArea placeholder={placeholder ?? tChats("placeholder")} />
					<ChatInputControls>
						<div className='flex items-center gap-1'>
							<ChatPlusMenu
								fileInputRef={fileInputRef}
								onOpenChange={setPlusMenuOpen}
								open={plusMenuOpen}
							/>
							{inputActions}
						</div>
						<ChatInputSubmit />
					</ChatInputControls>
				</ChatInputBody>
			</ChatInput>
		</div>
	);
};
