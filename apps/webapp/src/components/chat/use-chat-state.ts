"use client";

import { useCallback, useRef, useState } from "react";

import {
	type ChatAttachmentErrorCode,
	type ChatFileAttachment,
	isInlineModelAttachment,
} from "@/components/chat/chat-attachments";
import { useChatSession } from "@/components/chat/stores/chat-session-store";
import { useChatFileUpload } from "@/components/chat/use-chat-file-upload";
import type { BaseChatUIMessage } from "@webld/server";

export type ChatState = {
	attachmentError: ChatAttachmentErrorCode | null;
	attachments: ChatFileAttachment[];
	clearAttachmentError: () => void;
	handleFilesAdded: (files: File[]) => Promise<void>;
	handleFilesRejected: (error: ChatAttachmentErrorCode) => void;
	input: string;
	handleSubmit: (e?: React.FormEvent) => Promise<void>;
	handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	canSubmit: boolean;
	isReadingAttachments: boolean;
	isLoading: boolean;
	removeAttachment: (id: string) => void;
	stop?: () => void;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

export const useChatState = (): ChatState => {
	const [input, setInput] = useState("");
	const {
		attachmentError,
		attachments,
		clearAttachmentError,
		clearAttachments,
		hasFailedAttachments,
		handleFilesAdded,
		handleFilesRejected,
		isReadingAttachments,
		removeAttachment,
		waitForAttachmentUploads,
	} = useChatFileUpload({ uploadToKnowledgeBase: true });
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const { status, sendMessage, stop } = useChatSession((state) => ({
		status: state.status,
		sendMessage: state.actions?.sendMessage,
		stop: state.actions?.stop,
	}));

	const handleSubmit = useCallback(
		async (e?: React.FormEvent) => {
			e?.preventDefault();

			const messageAttachments = attachments.filter((attachment) => attachment.uploadStatus !== "error");

			if ((!input.trim() && messageAttachments.length === 0) || !sendMessage || isReadingAttachments) {
				return;
			}

			const messageText = input;
			setInput("");
			clearAttachments({ abort: false });

			let submittedAttachments: ChatFileAttachment[];

			try {
				submittedAttachments = await waitForAttachmentUploads({ attachments: messageAttachments });
			} catch {
				return;
			}

			const parts: BaseChatUIMessage["parts"] = [
				...submittedAttachments.flatMap((attachment) =>
					attachment.fileId
						? [
								{
									type: "data-attachment" as const,
									data: {
										fileId: attachment.fileId,
										filename: attachment.filename,
										mediaType: attachment.mediaType,
									},
								},
							]
						: []
				),
				...submittedAttachments.flatMap((attachment) =>
					isInlineModelAttachment({ mediaType: attachment.mediaType })
						? [
								{
									type: "file" as const,
									filename: attachment.filename,
									mediaType: attachment.mediaType,
									url: attachment.url,
								},
							]
						: []
				),
				...(messageText.trim() ? [{ type: "text" as const, text: messageText }] : []),
			];

			await sendMessage({
				role: "user",
				parts,
			});

			requestAnimationFrame(() => {
				textareaRef.current?.focus();
			});
		},
		[attachments, clearAttachments, input, isReadingAttachments, sendMessage, waitForAttachmentUploads]
	);

	const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInput(e.target.value);
	}, []);

	return {
		attachmentError,
		attachments,
		clearAttachmentError,
		handleFilesAdded,
		handleFilesRejected,
		input,
		handleSubmit,
		handleInputChange,
		canSubmit:
			!isReadingAttachments &&
			!hasFailedAttachments &&
			(Boolean(input.trim()) || attachments.some((attachment) => attachment.uploadStatus !== "error")),
		isReadingAttachments,
		isLoading: status === "streaming" || status === "submitted",
		removeAttachment,
		stop,
		textareaRef,
	};
};
