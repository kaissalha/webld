export const CHAT_ATTACHMENT_MAX_FILES = 6;
export const CHAT_ATTACHMENT_MAX_SIZE_BYTES = 5 * 1024 * 1024;

const KNOWLEDGE_BASE_TEXT_EXTENSIONS = new Set(["csv", "json", "log", "md", "mdx", "txt", "yaml", "yml"]);

const KNOWLEDGE_BASE_DOCUMENT_MIME_TYPES = new Set([
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.ms-excel",
	"application/xml",
]);

const KNOWLEDGE_BASE_DOCUMENT_EXTENSIONS = new Set(["docx", "htm", "html", "pdf", "xls", "xlsx", "xml"]);

export type ChatFileAttachment = {
	fileId?: string;
	filename: string;
	id: string;
	mediaType: string;
	size: number;
	uploadStatus?: "uploading" | "processing" | "uploaded" | "error";
	url: string;
};

export type ChatAttachmentErrorCode = "read-failed" | "too-large" | "too-many" | "unsupported-type" | "upload-failed";

export const getChatAttachmentExtension = ({ filename }: { filename: string }) => {
	const extension = filename.split(".").pop()?.toLowerCase();

	if (!extension || extension === filename.toLowerCase()) {
		return "";
	}

	return extension;
};

export const isInlineModelAttachment = ({ mediaType }: { mediaType: string }) => {
	return mediaType.startsWith("image/") || mediaType === "application/pdf";
};

export const isKnowledgeBaseAttachment = ({ filename, mediaType }: { filename: string; mediaType: string }) => {
	const extension = getChatAttachmentExtension({ filename });

	return (
		mediaType.startsWith("image/") ||
		mediaType.startsWith("text/") ||
		mediaType === "application/json" ||
		KNOWLEDGE_BASE_DOCUMENT_MIME_TYPES.has(mediaType) ||
		KNOWLEDGE_BASE_DOCUMENT_EXTENSIONS.has(extension) ||
		KNOWLEDGE_BASE_TEXT_EXTENSIONS.has(extension)
	);
};
