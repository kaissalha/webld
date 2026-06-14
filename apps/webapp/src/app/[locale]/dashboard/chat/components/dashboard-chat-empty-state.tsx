"use client";

import { useCallback } from "react";

import { useTranslations } from "next-intl";

import { useChatSession } from "@/components/chat/stores/chat-session-store";
import { Button } from "@webld/ui/components/button";

type DashboardChatEmptyStateProps = {
	onNewChat: () => void;
};

export const DashboardChatEmptyState = ({ onNewChat }: DashboardChatEmptyStateProps) => {
	const t = useTranslations("chats");
	const sendMessage = useChatSession((state) => state.runtimeActions.sendMessage);

	const handleSuggestionSelect = useCallback(
		async ({ text }: { text: string }) => {
			if (!sendMessage) {
				return;
			}

			await sendMessage({
				role: "user",
				parts: [{ type: "text", text }],
			});
		},
		[sendMessage]
	);

	return (
		<div className='mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 text-center'>
			<div className='space-y-2'>
				<h2 className='text-2xl font-semibold text-foreground'>{t("startConversation")}</h2>
				<p className='text-sm text-muted-foreground'>{t("askAnything")}</p>
			</div>
			<div className='flex flex-wrap items-center justify-center gap-2'>
				<Button
					type='button'
					variant='outline'
					onClick={() => handleSuggestionSelect({ text: t("suggestions.dashboard.today") })}
				>
					{t("suggestions.dashboard.today")}
				</Button>
				<Button
					type='button'
					variant='outline'
					onClick={() => handleSuggestionSelect({ text: t("suggestions.dashboard.overview") })}
				>
					{t("suggestions.dashboard.overview")}
				</Button>
				<Button type='button' variant='ghost' onClick={onNewChat}>
					{t("newChat")}
				</Button>
			</div>
		</div>
	);
};
