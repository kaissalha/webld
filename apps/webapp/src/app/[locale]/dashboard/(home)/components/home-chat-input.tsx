"use client";

import { useCallback, useRef, useState, useTransition } from "react";

import { v4 as uuidv4 } from "uuid";

import { isInlineModelAttachment } from "@/components/chat/chat-attachments";
import { ChatComposer } from "@/components/chat/chat-composer";
import { storeDashboardChatHandoff } from "@/components/chat/dashboard-chat-handoff";
import { useChatFileUpload } from "@/components/chat/use-chat-file-upload";
import { useRouter } from "@/i18n/navigation";

export const HomeChatInput = () => {
	const router = useRouter();
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [input, setInput] = useState("");
	const [isNavigating, startTransition] = useTransition();
	const {
		attachmentError,
		attachments,
		clearAttachments,
		hasFailedAttachments,
		handleFilesAdded,
		handleFilesRejected,
		isReadingAttachments,
		removeAttachment,
		waitForAttachmentUploads,
	} = useChatFileUpload({ uploadToKnowledgeBase: true });
	const hasSubmittableAttachments = attachments.some((attachment) => attachment.uploadStatus !== "error");

	const handleSubmit = useCallback(async () => {
		const messageAttachments = attachments.filter((attachment) => attachment.uploadStatus !== "error");

		if ((!input.trim() && messageAttachments.length === 0) || isReadingAttachments) {
			return;
		}

		setInput("");
		clearAttachments({ abort: false });

		let submittedAttachments = messageAttachments;

		try {
			submittedAttachments = await waitForAttachmentUploads({ attachments: messageAttachments });
		} catch {
			return;
		}

		const uploadedFileNames = submittedAttachments.map((attachment) => attachment.filename);
		const indexedFileNames = submittedAttachments
			.filter((attachment) => attachment.documentId)
			.map((attachment) => attachment.filename);
		const message =
			input.trim() ||
			(indexedFileNames.length > 0
				? `I uploaded ${indexedFileNames.join(", ")}. Use the knowledge base to answer my next question.`
				: uploadedFileNames.length > 0
					? `I uploaded ${uploadedFileNames.join(", ")}.`
					: "");

		if (!message && submittedAttachments.length === 0) {
			return;
		}

		const chatId = uuidv4();
		storeDashboardChatHandoff({
			attachments: submittedAttachments.map((attachment) => ({
				documentId: attachment.documentId,
				filename: attachment.filename,
				mediaType: attachment.mediaType,
				url: isInlineModelAttachment({ mediaType: attachment.mediaType }) ? attachment.url : undefined,
			})),
			chatId,
			message,
		});

		startTransition(() => {
			router.push(`/dashboard/chat?chat=${chatId}`);
		});
	}, [attachments, clearAttachments, input, isReadingAttachments, router, waitForAttachmentUploads]);

	const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInput(e.target.value);
	}, []);

	return (
		<ChatComposer
			attachmentError={attachmentError}
			attachments={attachments}
			containerClassName='pointer-events-auto mb-4 w-full max-w-3xl animate-[fade-in-up] [animation-duration:500ms] fill-mode-both [animation-timing-function:cubic-bezier(0.23,1,0.32,1)] [animation-delay:240ms]'
			input={input}
			canSubmit={!hasFailedAttachments && (Boolean(input.trim()) || hasSubmittableAttachments)}
			isDisabled={isNavigating}
			isReadingAttachments={isReadingAttachments}
			onAttachmentError={handleFilesRejected}
			onFilesAdded={handleFilesAdded}
			onInputChange={handleInputChange}
			onRemoveAttachment={removeAttachment}
			onSubmit={handleSubmit}
			textareaRef={textareaRef}
		/>
	);
};
