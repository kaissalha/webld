const DASHBOARD_CHAT_HANDOFF_STORAGE_PREFIX = "dashboard-chat-handoff";
const DASHBOARD_CHAT_HANDOFF_MAX_AGE_MS = 5 * 60 * 1000;

export type DashboardChatHandoffAttachment = {
	documentId?: string;
	filename: string;
	mediaType: string;
	url?: string;
};

export type DashboardChatHandoff = {
	attachments?: DashboardChatHandoffAttachment[];
	chatId: string;
	createdAt: number;
	message: string;
};

const writeHandoff = ({ key, payload }: { key: string; payload: DashboardChatHandoff }) => {
	try {
		window.sessionStorage.setItem(key, JSON.stringify(payload));
		return true;
	} catch {
		return false;
	}
};

export const storeDashboardChatHandoff = ({
	attachments,
	chatId,
	message,
}: {
	attachments?: DashboardChatHandoffAttachment[];
	chatId: string;
	message: string;
}) => {
	if (typeof window === "undefined") {
		return;
	}

	const key = `${DASHBOARD_CHAT_HANDOFF_STORAGE_PREFIX}:${chatId}`;
	const payload: DashboardChatHandoff = {
		attachments,
		chatId,
		createdAt: Date.now(),
		message,
	};

	if (writeHandoff({ key, payload })) {
		return;
	}

	if (attachments && attachments.length > 0) {
		const strippedAttachments = attachments.map(({ url: _url, ...rest }) => rest);

		if (
			writeHandoff({
				key,
				payload: { ...payload, attachments: strippedAttachments },
			})
		) {
			return;
		}
	}

	writeHandoff({
		key,
		payload: { chatId, createdAt: Date.now(), message },
	});
};

const isAttachmentArray = (value: unknown): value is DashboardChatHandoffAttachment[] => {
	if (!Array.isArray(value)) {
		return false;
	}

	return value.every(
		(item) =>
			item != null &&
			typeof item === "object" &&
			typeof (item as { filename?: unknown }).filename === "string" &&
			typeof (item as { mediaType?: unknown }).mediaType === "string"
	);
};

export const consumeDashboardChatHandoff = ({ chatId }: { chatId: string }): DashboardChatHandoff | null => {
	if (typeof window === "undefined") {
		return null;
	}

	const storageKey = `${DASHBOARD_CHAT_HANDOFF_STORAGE_PREFIX}:${chatId}`;
	const storedValue = window.sessionStorage.getItem(storageKey);

	if (!storedValue) {
		return null;
	}

	window.sessionStorage.removeItem(storageKey);

	try {
		const parsedValue: unknown = JSON.parse(storedValue);

		if (
			!parsedValue ||
			typeof parsedValue !== "object" ||
			!("chatId" in parsedValue) ||
			!("message" in parsedValue) ||
			!("createdAt" in parsedValue)
		) {
			return null;
		}

		const storedChatId = (parsedValue as { chatId: unknown }).chatId;
		const message = (parsedValue as { message: unknown }).message;
		const createdAt = (parsedValue as { createdAt: unknown }).createdAt;
		const attachments = (parsedValue as { attachments?: unknown }).attachments;

		if (typeof storedChatId !== "string" || typeof message !== "string" || typeof createdAt !== "number") {
			return null;
		}

		if (storedChatId !== chatId) {
			return null;
		}

		if (Date.now() - createdAt > DASHBOARD_CHAT_HANDOFF_MAX_AGE_MS) {
			return null;
		}

		return {
			attachments: isAttachmentArray(attachments) ? attachments : undefined,
			chatId: storedChatId,
			createdAt,
			message,
		};
	} catch {
		return null;
	}
};
