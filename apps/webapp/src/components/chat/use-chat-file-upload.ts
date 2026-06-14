"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
	CHAT_ATTACHMENT_MAX_FILES,
	CHAT_ATTACHMENT_MAX_SIZE_BYTES,
	type ChatAttachmentErrorCode,
	type ChatFileAttachment,
	isInlineModelAttachment,
	isKnowledgeBaseAttachment,
} from "@/components/chat/chat-attachments";

const STATUS_POLL_INTERVAL_MS = 1500;
const STATUS_POLL_TIMEOUT_MS = 5 * 60 * 1000;

type AttachmentUploadMode = "inline" | "knowledge" | "inline-and-knowledge" | "unsupported";

type ClearAttachmentsOptions = {
	abort?: boolean;
};

const readFileAsDataUrl = ({ file }: { file: File }) =>
	new Promise<string>((resolve, reject) => {
		const reader = new FileReader();

		reader.onerror = () => {
			reject(new Error("Failed to read file"));
		};
		reader.onload = () => {
			if (typeof reader.result === "string") {
				resolve(reader.result);
				return;
			}

			reject(new Error("Failed to read file"));
		};
		reader.readAsDataURL(file);
	});

const createAttachmentFromFile = async ({
	file,
	uploadStatus,
}: {
	file: File;
	uploadStatus?: ChatFileAttachment["uploadStatus"];
}): Promise<ChatFileAttachment> => ({
	filename: file.name,
	id: crypto.randomUUID(),
	mediaType: file.type || "application/octet-stream",
	size: file.size,
	uploadStatus,
	url: await readFileAsDataUrl({ file }),
});

const getAttachmentUploadMode = ({
	file,
	uploadToKnowledgeBase,
}: {
	file: File;
	uploadToKnowledgeBase: boolean;
}): AttachmentUploadMode => {
	if (!uploadToKnowledgeBase) {
		return "inline";
	}

	const mediaType = file.type || "application/octet-stream";
	const canUseInline = isInlineModelAttachment({ mediaType });
	const canUseKnowledgeBase = isKnowledgeBaseAttachment({ filename: file.name, mediaType });

	if (canUseInline && canUseKnowledgeBase) {
		return "inline-and-knowledge";
	}

	if (canUseKnowledgeBase) {
		return "knowledge";
	}

	if (canUseInline) {
		return "inline";
	}

	return "unsupported";
};

const shouldUploadAttachment = ({ mode }: { mode: AttachmentUploadMode }) => {
	return mode === "knowledge" || mode === "inline-and-knowledge";
};

const isAbortError = ({ error }: { error: unknown }) => {
	return error instanceof Error && (error.name === "AbortError" || error.message === "Upload cancelled");
};

const uploadKnowledgeBaseDocument = async ({ file, signal }: { file: File; signal?: AbortSignal }) => {
	const formData = new FormData();

	formData.set("file", file);
	formData.set("name", file.name);
	formData.set("source", file.name);
	formData.set(
		"metadata",
		JSON.stringify({
			lastModified: file.lastModified,
			mediaType: file.type || "application/octet-stream",
			size: file.size,
		})
	);

	const response = await fetch("/api/rag/documents", {
		method: "POST",
		body: formData,
		signal,
	});

	if (!response.ok) {
		const errorBody = (await response.json().catch(() => null)) as { error?: string | { message?: string } } | null;
		const message =
			typeof errorBody?.error === "string"
				? errorBody.error
				: (errorBody?.error?.message ?? `Upload failed (${response.status})`);
		throw new Error(message);
	}

	const body = (await response.json()) as { document: { id: string; status: "pending" | "ready" | "failed" } };

	return body.document;
};

const pollKnowledgeBaseStatus = async ({
	documentId,
	signal,
}: {
	documentId: string;
	signal?: AbortSignal;
}): Promise<"ready" | "failed"> => {
	const start = Date.now();

	while (Date.now() - start < STATUS_POLL_TIMEOUT_MS) {
		if (signal?.aborted) {
			throw new Error("Upload cancelled");
		}

		const response = await fetch(`/api/rag/documents/${documentId}`, { signal });

		if (response.ok) {
			const body = (await response.json()) as {
				document: { status: "pending" | "ready" | "failed"; error?: string | null };
			};

			if (body.document.status === "ready") {
				return "ready";
			}

			if (body.document.status === "failed") {
				throw new Error(body.document.error ?? "Indexing failed");
			}
		}

		await new Promise((resolve) => setTimeout(resolve, STATUS_POLL_INTERVAL_MS));
	}

	throw new Error("Indexing timed out");
};

export const useChatFileUpload = ({ uploadToKnowledgeBase = false }: { uploadToKnowledgeBase?: boolean } = {}) => {
	const [attachments, setAttachments] = useState<ChatFileAttachment[]>([]);
	const [attachmentError, setAttachmentError] = useState<ChatAttachmentErrorCode | null>(null);
	const [isReadingAttachments, setIsReadingAttachments] = useState(false);
	const attachmentsRef = useRef<ChatFileAttachment[]>([]);
	const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
	const documentUploadPromisesRef = useRef<Map<string, Promise<string>>>(new Map());

	useEffect(
		() => () => {
			for (const controller of abortControllersRef.current.values()) {
				controller.abort();
			}
			abortControllersRef.current.clear();
			documentUploadPromisesRef.current.clear();
		},
		[]
	);

	useEffect(() => {
		attachmentsRef.current = attachments;
	}, [attachments]);

	const updateAttachment = useCallback((id: string, patch: Partial<ChatFileAttachment>) => {
		setAttachments((currentAttachments) => {
			const nextAttachments = currentAttachments.map((attachment) =>
				attachment.id === id ? { ...attachment, ...patch } : attachment
			);
			attachmentsRef.current = nextAttachments;
			return nextAttachments;
		});
	}, []);

	const startKnowledgeBaseUpload = useCallback(
		({ attachment, file }: { attachment: ChatFileAttachment; file: File }) => {
			const controller = new AbortController();
			abortControllersRef.current.set(attachment.id, controller);

			const documentIdPromise = uploadKnowledgeBaseDocument({ file, signal: controller.signal }).then(
				(document) => {
					updateAttachment(attachment.id, {
						documentId: document.id,
						uploadStatus: "processing",
					});

					return document.id;
				}
			);

			documentUploadPromisesRef.current.set(attachment.id, documentIdPromise);

			void documentIdPromise
				.then(async (documentId) => {
					const finalStatus = await pollKnowledgeBaseStatus({
						documentId,
						signal: controller.signal,
					});

					updateAttachment(attachment.id, {
						uploadStatus: finalStatus === "ready" ? "uploaded" : "error",
					});
				})
				.catch((error: unknown) => {
					if (isAbortError({ error })) {
						return;
					}

					setAttachmentError("upload-failed");
					updateAttachment(attachment.id, { uploadStatus: "error" });
				})
				.finally(() => {
					abortControllersRef.current.delete(attachment.id);
					documentUploadPromisesRef.current.delete(attachment.id);
				});
		},
		[updateAttachment]
	);

	const handleFilesAdded = useCallback(
		async (files: File[]) => {
			if (files.length === 0) {
				return;
			}

			const remainingSlots = CHAT_ATTACHMENT_MAX_FILES - attachments.length;

			if (remainingSlots <= 0) {
				setAttachmentError("too-many");
				return;
			}

			const filesWithinLimit = files.slice(0, remainingSlots);
			const preparedFiles = filesWithinLimit
				.map((file) => ({
					file,
					mode: getAttachmentUploadMode({ file, uploadToKnowledgeBase }),
				}))
				.filter(({ file }) => file.size <= CHAT_ATTACHMENT_MAX_SIZE_BYTES);
			const acceptedFiles = preparedFiles.filter(({ mode }) => mode !== "unsupported");

			if (acceptedFiles.length < filesWithinLimit.length || filesWithinLimit.length < files.length) {
				setAttachmentError(
					files.some((file) => file.size > CHAT_ATTACHMENT_MAX_SIZE_BYTES)
						? "too-large"
						: preparedFiles.some(({ mode }) => mode === "unsupported")
							? "unsupported-type"
							: "too-many"
				);
			} else {
				setAttachmentError(null);
			}

			if (acceptedFiles.length === 0) {
				return;
			}

			setIsReadingAttachments(true);

			let nextAttachments: ChatFileAttachment[];

			try {
				nextAttachments = await Promise.all(
					acceptedFiles.map(({ file, mode }) =>
						createAttachmentFromFile({
							file,
							uploadStatus: shouldUploadAttachment({ mode }) ? "uploading" : undefined,
						})
					)
				);
				setAttachments((currentAttachments) => {
					const updatedAttachments = [...currentAttachments, ...nextAttachments].slice(
						0,
						CHAT_ATTACHMENT_MAX_FILES
					);
					attachmentsRef.current = updatedAttachments;
					return updatedAttachments;
				});
			} catch {
				setAttachmentError("read-failed");
				setIsReadingAttachments(false);
				return;
			}

			setIsReadingAttachments(false);

			nextAttachments.forEach((attachment, index) => {
				const preparedFile = acceptedFiles[index];

				if (!preparedFile || !shouldUploadAttachment({ mode: preparedFile.mode })) {
					return;
				}

				startKnowledgeBaseUpload({ attachment, file: preparedFile.file });
			});
		},
		[attachments.length, startKnowledgeBaseUpload, uploadToKnowledgeBase]
	);

	const removeAttachment = useCallback((id: string) => {
		const controller = abortControllersRef.current.get(id);
		controller?.abort();
		abortControllersRef.current.delete(id);
		documentUploadPromisesRef.current.delete(id);
		setAttachments((currentAttachments) => {
			const nextAttachments = currentAttachments.filter((attachment) => attachment.id !== id);
			attachmentsRef.current = nextAttachments;
			return nextAttachments;
		});
		setAttachmentError(null);
	}, []);

	const clearAttachments = useCallback((options: ClearAttachmentsOptions = {}) => {
		if (options.abort ?? true) {
			for (const controller of abortControllersRef.current.values()) {
				controller.abort();
			}
			abortControllersRef.current.clear();
			documentUploadPromisesRef.current.clear();
		}
		attachmentsRef.current = [];
		setAttachments([]);
		setAttachmentError(null);
	}, []);

	const waitForAttachmentUploads = useCallback(
		async ({ attachments: attachmentsToWait }: { attachments: ChatFileAttachment[] }) => {
			return Promise.all(
				attachmentsToWait.map(async (attachment) => {
					if (!attachment.uploadStatus || attachment.documentId) {
						return attachment;
					}

					if (attachment.uploadStatus === "error") {
						throw new Error("Attachment upload failed");
					}

					const documentIdPromise = documentUploadPromisesRef.current.get(attachment.id);

					if (!documentIdPromise) {
						const currentAttachment = attachmentsRef.current.find((item) => item.id === attachment.id);

						if (currentAttachment?.documentId) {
							return currentAttachment;
						}

						throw new Error("Attachment upload is not available");
					}

					const documentId = await documentIdPromise;

					return {
						...attachment,
						documentId,
						uploadStatus: "processing" as const,
					};
				})
			);
		},
		[]
	);

	const clearAttachmentError = useCallback(() => {
		setAttachmentError(null);
	}, []);

	const handleFilesRejected = useCallback((error: ChatAttachmentErrorCode) => {
		setAttachmentError(error);
	}, []);

	return {
		attachmentError,
		attachments,
		clearAttachmentError,
		clearAttachments,
		hasFailedAttachments: attachments.some((attachment) => attachment.uploadStatus === "error"),
		hasPendingAttachments: attachments.some(
			(attachment) => attachment.uploadStatus === "uploading" || attachment.uploadStatus === "processing"
		),
		handleFilesAdded,
		handleFilesRejected,
		isReadingAttachments,
		removeAttachment,
		waitForAttachmentUploads,
	};
};
