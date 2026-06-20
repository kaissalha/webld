"use client";

import { useTranslations } from "next-intl";

import { useChatSession } from "@/components/chat/stores/chat-session-store";
import { Button } from "@webld/ui/components/button";

import { DashboardNewChatButton } from "./dashboard-new-chat-button";

type DashboardChatEmptyStateProps = {
	onNewChat: () => void;
};

export const DashboardChatEmptyState = ({ onNewChat }: DashboardChatEmptyStateProps) => {
	const t = useTranslations("chats");
	const sendMessage = useChatSession((state) => state.runtimeActions.sendMessage);

	const handleSuggestionSelect = async ({ text }: { text: string }) => {
		if (!sendMessage) {
			return;
		}

		await sendMessage({
			role: "user",
			parts: [{ type: "text", text }],
		});
	};

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
					onClick={() => handleSuggestionSelect({ text: t("suggestions.dashboard.contacts") })}
				>
					{t("suggestions.dashboard.contacts")}
				</Button>
				<Button
					type='button'
					variant='outline'
					onClick={() => handleSuggestionSelect({ text: t("suggestions.dashboard.knowledge") })}
				>
					{t("suggestions.dashboard.knowledge")}
				</Button>
				<DashboardNewChatButton onClick={onNewChat} />
			</div>
		</div>
	);
};
