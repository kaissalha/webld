export const MAIL_CLASSIFICATION_LABELS = ["to respond", "meeting update", "fyi", "notification", "marketing"] as const;

export type MailClassificationLabelName = (typeof MAIL_CLASSIFICATION_LABELS)[number];

export type MailClassificationLabelDefinition = {
	backgroundColor: string;
	description: string;
	textColor: string;
};

export const MAIL_CLASSIFICATION_LABEL_DEFINITIONS: Record<
	MailClassificationLabelName,
	MailClassificationLabelDefinition
> = {
	"to respond": {
		backgroundColor: "#f2b2a8",
		description: "The mailbox owner should send a direct human reply or confirmation next.",
		textColor: "#8a1c0a",
	},
	"meeting update": {
		backgroundColor: "#c9daf8",
		description: "The message is mainly about scheduling, invites, reschedules, agendas, or meeting logistics.",
		textColor: "#0d3472",
	},
	fyi: {
		backgroundColor: "#e4d7f5",
		description: "The message is informational and does not clearly require action from the mailbox owner.",
		textColor: "#3d188e",
	},
	notification: {
		backgroundColor: "#b3efd3",
		description: "The message is an automated or transactional alert, reminder, receipt, or status update.",
		textColor: "#0b4f30",
	},
	marketing: {
		backgroundColor: "#fef1d1",
		description: "The message is promotional, newsletter-like, sales-oriented, or announcement-driven.",
		textColor: "#684e07",
	},
};

export const getMailClassificationLabelName = (value: string | null | undefined) => {
	if (!value) {
		return null;
	}

	const normalizedValue = value.trim().toLowerCase();

	return MAIL_CLASSIFICATION_LABELS.find((label) => label === normalizedValue) ?? null;
};
