"use client";

import { useState } from "react";

import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { v4 as uuidv4 } from "uuid";

import { Header } from "@/app/[locale]/dashboard/components/layout/header/header";
import { ChatContent } from "@/components/chat/chat-content";
import { ChatSessionProvider, useChatSession } from "@/components/chat/stores/chat-session-store";
import { useRouter } from "@/i18n/navigation";
import type { DashboardChatUIMessage } from "@webld/server";
import { Button } from "@webld/ui/components/button";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@webld/ui/components/tooltip";

type DashboardChatPageProps = {
	chatId: string;
	initialMessages?: DashboardChatUIMessage[];
};

const EMPTY_INITIAL_MESSAGES: DashboardChatUIMessage[] = [];

const DashboardNewChatButton = ({ onClick }: { onClick: () => void }) => {
	const t = useTranslations("chats");
	const label = t("newChat");

	return (
		<TooltipProvider delay={0}>
			<Tooltip>
				<TooltipTrigger
					delay={0}
					render={<Button type='button' variant='ghost' size='icon' onClick={onClick} aria-label={label} />}
				>
					<PlusIcon className='size-4' aria-hidden />
				</TooltipTrigger>
				<TooltipPopup>{label}</TooltipPopup>
			</Tooltip>
		</TooltipProvider>
	);
};

const DashboardChatEmptyState = ({ onNewChat }: { onNewChat: () => void }) => {
	const t = useTranslations("chats");
	const sendMessage = useChatSession((state) => state.actions?.sendMessage);

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

export const DashboardNewChatPage = () => {
	const [chatId] = useState(() => uuidv4());

	return <DashboardChatPage chatId={chatId} />;
};

export const DashboardChatPage = ({ chatId, initialMessages = EMPTY_INITIAL_MESSAGES }: DashboardChatPageProps) => {
	const router = useRouter();

	const handleChatCreated = (createdChatId: string) => {
		router.replace(`/dashboard/chat?chatId=${createdChatId}`);
	};

	const handleNewChat = () => {
		router.push("/dashboard/chat");
	};

	return (
		<ChatSessionProvider
			key={chatId}
			initialMessages={initialMessages}
			runtime={{
				chatId,
				api: "/api/chat",
				onChatCreated: handleChatCreated,
			}}
		>
			<div className='flex h-[calc(100dvh-var(--sidebar-inset-top,0px))] max-h-[calc(100dvh-var(--sidebar-inset-top,0px))] min-h-0 flex-col overflow-hidden'>
				<Header item={{ labelTx: "chat" }} actions={<DashboardNewChatButton onClick={handleNewChat} />} />
				<div className='min-h-0 flex-1 overflow-hidden'>
					<ChatContent emptyState={<DashboardChatEmptyState onNewChat={handleNewChat} />} />
				</div>
			</div>
		</ChatSessionProvider>
	);
};
