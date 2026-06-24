"use client";

import type React from "react";
import { useEffect, useRef } from "react";

import { useTranslations } from "next-intl";

import { CHAT_ATTACHMENT_MAX_FILES, CHAT_ATTACHMENT_MAX_SIZE_BYTES } from "@/components/chat/chat-attachments";
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
import { useChatState } from "@/components/chat/use-chat-state";

const ATTACHMENT_ERROR_MESSAGE_KEYS = {
	"too-large": "fileTooLarge",
	"too-many": "tooManyFiles",
	"unsupported-type": "unsupportedFileType",
	"upload-failed": "fileUploadFailed",
	"read-failed": "fileReadFailed",
} as const;

const ATTACHMENT_MAX_SIZE_LABEL =
	CHAT_ATTACHMENT_MAX_SIZE_BYTES < 1024 * 1024
		? `${Math.max(1, Math.round(CHAT_ATTACHMENT_MAX_SIZE_BYTES / 1024))} KB`
		: `${Math.round(CHAT_ATTACHMENT_MAX_SIZE_BYTES / (1024 * 1024))} MB`;

export type ChatComposerProps = {
	accept?: string;
	className?: string;
	containerClassName?: string;
	isDisabled?: boolean;
};

export const ChatComposer = ({ accept, className, containerClassName, isDisabled = false }: ChatComposerProps) => {
	const {
		attachmentError,
		attachments,
		canSubmit,
		input,
		isLoading,
		isReadingAttachments,
		handleFilesRejected: onAttachmentError,
		handleFilesAdded: onFilesAdded,
		handleInputChange: onInputChange,
		handleSubmit: onSubmit,
		removeAttachment: onRemoveAttachment,
		stop: onStop,
		textareaRef,
	} = useChatState();

	const tChats = useTranslations("chats");
	const inputT = useTranslations("components.chat.input");
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		textareaRef.current?.focus();
	}, [textareaRef]);

	const attachmentSlotsRemaining = Math.max(CHAT_ATTACHMENT_MAX_FILES - attachments.length, 0);
	const isAttachDisabled = isLoading || isReadingAttachments || isDisabled || attachmentSlotsRemaining === 0;

	const handleFiles = (files: File[]) => {
		const tooLarge = files.filter((file) => file.size > CHAT_ATTACHMENT_MAX_SIZE_BYTES);

		if (tooLarge.length > 0 && tooLarge.length === files.length) {
			onAttachmentError("too-large");
			return;
		}

		void onFilesAdded(files);
	};

	const { handleDragOver, handleDrop } = useChatDropHandlers({
		disabled: isAttachDisabled,
		onFiles: handleFiles,
	});

	const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files ? Array.from(event.target.files) : [];
		event.target.value = "";

		if (files.length > 0) {
			handleFiles(files);
		}
	};

	return (
		<div className={containerClassName} onDragOver={handleDragOver} onDrop={handleDrop}>
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
			<ChatInput
				canSubmit={canSubmit}
				className={className}
				disabled={isDisabled || isReadingAttachments}
				loading={isLoading}
				onChange={onInputChange}
				onStop={onStop}
				onSubmit={onSubmit}
				textareaRef={textareaRef}
				value={input}
			>
				{attachments.length > 0 && (
					<ChatInputAttachments>
						{attachments.map((attachment) => (
							<ChatAttachmentTile
								attachment={attachment}
								key={attachment.id}
								onRemove={(id) => onRemoveAttachment(id)}
							/>
						))}
					</ChatInputAttachments>
				)}
				{attachmentError && (
					<p className='px-4 pb-1 text-destructive text-xs'>
						{inputT(ATTACHMENT_ERROR_MESSAGE_KEYS[attachmentError], {
							count: CHAT_ATTACHMENT_MAX_FILES,
							size: ATTACHMENT_MAX_SIZE_LABEL,
						})}
					</p>
				)}
				<ChatInputBody>
					<ChatInputTextArea placeholder={tChats("placeholder")} />
					<ChatInputControls>
						<div className='flex items-center gap-1'>
							<ChatPlusMenu disabled={isAttachDisabled} fileInputRef={fileInputRef} />
						</div>
						<ChatInputSubmit />
					</ChatInputControls>
				</ChatInputBody>
			</ChatInput>
		</div>
	);
};
