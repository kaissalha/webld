"use client";

import type React from "react";
import { useCallback, useRef } from "react";

import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { ChatAttachmentPreview } from "@/components/chat/chat-attachment-preview";
import {
	CHAT_ATTACHMENT_MAX_FILES,
	CHAT_ATTACHMENT_MAX_SIZE_BYTES,
	type ChatAttachmentErrorCode,
	type ChatFileAttachment,
} from "@/components/chat/chat-attachments";
import { ChatInput, ChatInputSubmit, ChatInputTextArea } from "@/components/chat/chat-input";
import { useChatDropHandlers } from "@/components/chat/use-chat-drop-handlers";
import { cn } from "@webld/ui/lib/utils";

const EMPTY_ATTACHMENTS: ChatFileAttachment[] = [];

export type ChatComposerProps = {
	attachmentError?: ChatAttachmentErrorCode | null;
	attachments?: ChatFileAttachment[];
	canSubmit?: boolean;
	className?: string;
	containerClassName?: string;
	inputActions?: React.ReactNode;
	input: string;
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
	attachmentError,
	attachments = EMPTY_ATTACHMENTS,
	canSubmit,
	className,
	containerClassName,
	inputActions,
	input,
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
	const canAttachFiles = Boolean(onFilesAdded);
	const attachmentSlotsRemaining = Math.max(CHAT_ATTACHMENT_MAX_FILES - attachments.length, 0);
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

	const handleAttachClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

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

	const attachmentErrorMessage = getAttachmentErrorMessage({
		error: attachmentError,
		fileTooLarge: inputT("fileTooLarge", { size: formatFileSize({ size: CHAT_ATTACHMENT_MAX_SIZE_BYTES }) }),
		fileUploadFailed: inputT("fileUploadFailed"),
		readFailed: inputT("fileReadFailed"),
		tooManyFiles: inputT("tooManyFiles", { count: CHAT_ATTACHMENT_MAX_FILES }),
		unsupportedType: inputT("unsupportedFileType"),
	});

	return (
		<div
			className={cn("relative w-full", containerClassName)}
			onDragOver={canAttachFiles ? handleDragOver : undefined}
			onDrop={canAttachFiles ? handleDrop : undefined}
		>
			{canAttachFiles && (
				<input
					ref={fileInputRef}
					type='file'
					multiple
					className='hidden'
					aria-label={inputT("chooseFiles")}
					onChange={handleFileInputChange}
				/>
			)}
			<ChatInput
				value={input}
				onChange={onInputChange}
				onSubmit={onSubmit}
				loading={isLoading}
				disabled={isDisabled || isReadingAttachments}
				canSubmit={canSubmit ?? (Boolean(input.trim()) || attachments.length > 0)}
				onStop={onStop}
				variant='default'
				className={cn("flex-col items-stretch gap-1.5 p-2", className)}
			>
				{attachments.length > 0 && (
					<ChatAttachmentPreview
						attachments={attachments}
						onRemoveAttachment={(id) => onRemoveAttachment?.(id)}
						removeLabel={(filename) => inputT("removeFile", { filename })}
					/>
				)}
				{attachmentErrorMessage && <p className='px-1 text-xs text-destructive'>{attachmentErrorMessage}</p>}
				<ChatInputTextArea
					ref={resolvedTextareaRef}
					placeholder={placeholder ?? tChats("placeholder")}
					className='px-1 pt-1'
				/>
				<div className='flex w-full items-center justify-between gap-2'>
					<div className='flex items-center gap-1'>
						{canAttachFiles && (
							<button
								type='button'
								onClick={handleAttachClick}
								disabled={isAttachDisabled}
								aria-label={inputT("attachFiles")}
								className='flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground'
							>
								<PlusIcon className='size-4' />
							</button>
						)}
						{inputActions}
					</div>
					<ChatInputSubmit />
				</div>
			</ChatInput>
		</div>
	);
};

const formatFileSize = ({ size }: { size: number }) => {
	if (size < 1024 * 1024) {
		return `${Math.max(1, Math.round(size / 1024))} KB`;
	}

	return `${Math.round(size / (1024 * 1024))} MB`;
};

const getAttachmentErrorMessage = ({
	error,
	fileTooLarge,
	fileUploadFailed,
	readFailed,
	tooManyFiles,
	unsupportedType,
}: {
	error: ChatAttachmentErrorCode | null | undefined;
	fileTooLarge: string;
	fileUploadFailed: string;
	readFailed: string;
	tooManyFiles: string;
	unsupportedType: string;
}) => {
	if (error === "too-large") {
		return fileTooLarge;
	}

	if (error === "too-many") {
		return tooManyFiles;
	}

	if (error === "unsupported-type") {
		return unsupportedType;
	}

	if (error === "upload-failed") {
		return fileUploadFailed;
	}

	if (error === "read-failed") {
		return readFailed;
	}

	return null;
};
