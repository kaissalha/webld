"use client";

import { useEffect } from "react";

import { consumeDashboardChatHandoff } from "@/components/chat/dashboard-chat-handoff";
import { useChatSession } from "@/components/chat/stores/chat-session-store";
import type { BaseChatUIMessage } from "@webld/server";

type DashboardChatHandoffEffectProps = {
	chatId: string;
};

export const DashboardChatHandoffEffect = ({ chatId }: DashboardChatHandoffEffectProps) => {
	const sendMessage = useChatSession((state) => state.runtimeActions.sendMessage);

	useEffect(() => {
		if (!sendMessage) {
			return;
		}

		const handoff = consumeDashboardChatHandoff({ chatId });

		if (!handoff) {
			return;
		}

		const handoffAttachments = handoff.attachments ?? [];
		const attachmentDataParts = handoffAttachments.flatMap((attachment) =>
			attachment.documentId
				? [
						{
							type: "data-attachment" as const,
							data: {
								documentId: attachment.documentId,
								filename: attachment.filename,
								mediaType: attachment.mediaType,
							},
						},
					]
				: []
		);
		const fileParts = handoffAttachments.flatMap((attachment) =>
			attachment.url
				? [
						{
							type: "file" as const,
							filename: attachment.filename,
							mediaType: attachment.mediaType,
							url: attachment.url,
						},
					]
				: []
		);
		const trimmedMessage = handoff.message.trim();
		const textParts = [...(trimmedMessage ? [{ type: "text" as const, text: trimmedMessage }] : [])];
		const parts: BaseChatUIMessage["parts"] = [...attachmentDataParts, ...fileParts, ...textParts];

		if (parts.length === 0) {
			return;
		}

		sendMessage({
			role: "user",
			parts,
		});
	}, [chatId, sendMessage]);

	return null;
};
