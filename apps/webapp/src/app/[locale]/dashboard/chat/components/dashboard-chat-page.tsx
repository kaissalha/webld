"use client";

import { useState } from "react";

import { v4 as uuidv4 } from "uuid";

import { Header } from "@/app/[locale]/dashboard/components/layout/header/header";
import { ChatContent } from "@/components/chat/chat-content";
import { ChatNewChatButton } from "@/components/chat/chat-new-chat-button";
import { ChatSessionProvider } from "@/components/chat/stores/chat-session-store";
import { useRouter } from "@/i18n/navigation";
import type { DashboardChatUIMessage } from "@webld/server";

type DashboardChatPageProps = {
	chatId: string;
	initialMessages?: DashboardChatUIMessage[];
};

const EMPTY_INITIAL_MESSAGES: DashboardChatUIMessage[] = [];

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
			<Header item={{ labelTx: "chat" }} actions={<ChatNewChatButton onClick={handleNewChat} />} />
			<div className='min-h-0 flex-1 overflow-hidden'>
				<ChatContent />
			</div>
		</ChatSessionProvider>
	);
};
