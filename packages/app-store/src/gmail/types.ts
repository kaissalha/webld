import type { gmail_v1 } from "@googleapis/gmail";

// ============================================================================
// Parsed types (normalized from raw Gmail API responses)
// These exist because Gmail API returns base64-encoded bodies and raw headers
// ============================================================================

export type MailLabelSummary = {
	backgroundColor: string | null;
	id: string;
	name: string;
	textColor: string | null;
};

// Parsed from raw header string like "John Doe <john@example.com>"
export type EmailSender = {
	name?: string;
	email: string;
};

// Parsed attachment info (combines data from MessagePart and MessagePartBody)
export type EmailAttachment = {
	attachmentId: string;
	filename: string;
	mimeType: string;
	size: number;
};

// Fully parsed message with decoded body and structured fields
export type ParsedMessage = {
	id: string;
	threadId?: string;
	subject: string;
	snippet?: string;
	sender: EmailSender;
	to: EmailSender[];
	cc: EmailSender[] | null;
	bcc: EmailSender[] | null;
	replyTo?: string;
	receivedOn: string;
	labelIds: string[];
	isUnread: boolean;
	isStarred: boolean;
	isDraft?: boolean;
	body: string;
	decodedBody?: string;
	attachments?: EmailAttachment[];
	messageId?: string;
	inReplyTo?: string;
	references?: string;
};

// Aggregated thread response
export type ThreadResponse = {
	classificationLabel?: MailLabelSummary | null;
	messages: ParsedMessage[];
	latest?: ParsedMessage;
	hasUnread: boolean;
	totalReplies: number;
	labels: gmail_v1.Schema$Label[];
};

// Lightweight preview for list view
export type ThreadPreview = {
	classificationLabel?: MailLabelSummary | null;
	id: string;
	subject: string;
	snippet: string;
	sender: EmailSender;
	receivedOn: string;
	isUnread: boolean;
	isStarred: boolean;
	labelIds: string[];
	messageIds?: string[];
	messageCount?: number;
};
