"use client";

import { useCallback } from "react";

import { useTranslations } from "next-intl";

import { Header } from "@/app/[locale]/dashboard/components/layout/header/header";
import { ChatSessionProvider } from "@/components/chat/stores/chat-session-store";
import { useRouter } from "@/i18n/navigation";
import type { DashboardChatUIMessage } from "@webld/server";
import { Button } from "@webld/ui/components/button";

import { ChatInterface } from "./chat-interface";
import { ChatRuntimeSync } from "./chat-runtime-sync";
import { DashboardChatEmptyState } from "./dashboard-chat-empty-state";
import { DashboardChatHandoffEffect } from "./dashboard-chat-handoff-effect";

type DashboardChatPageProps = {
	chatId: string;
	initialMessages: DashboardChatUIMessage[];
};

const DashboardChatPageContent = ({ chatId, initialMessages }: DashboardChatPageProps) => {
	const router = useRouter();
	const t = useTranslations("chats");

	const handleChatCreated = useCallback(
		(createdChatId: string) => {
			router.replace(`/dashboard/chat?chat=${createdChatId}`);
		},
		[router]
	);

	const handleNewChat = useCallback(() => {
		router.push("/dashboard/chat");
	}, [router]);

	return (
		<>
			<DashboardChatHandoffEffect chatId={chatId} />
			<ChatRuntimeSync
				chatId={chatId}
				initialMessages={initialMessages}
				api='/api/chat'
				onChatCreated={handleChatCreated}
			/>
			<div className='flex h-[calc(100dvh-var(--sidebar-inset-top,0px))] max-h-[calc(100dvh-var(--sidebar-inset-top,0px))] min-h-0 flex-col overflow-hidden'>
				<Header
					item={{ labelTx: "chat" }}
					actions={
						<Button type='button' variant='outline' onClick={handleNewChat}>
							{t("newChat")}
						</Button>
					}
				/>
				<div className='min-h-0 flex-1 overflow-hidden'>
					<ChatInterface emptyState={<DashboardChatEmptyState onNewChat={handleNewChat} />} />
				</div>
			</div>
		</>
	);
};

export const DashboardChatPage = ({ chatId, initialMessages }: DashboardChatPageProps) => {
	return (
		<ChatSessionProvider key={chatId} initialMessages={initialMessages}>
			<DashboardChatPageContent chatId={chatId} initialMessages={initialMessages} />
		</ChatSessionProvider>
	);
};
