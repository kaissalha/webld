import { headers } from "next/headers";

import { z } from "zod";

import { convertDbMessagesForUI, type DashboardChatUIMessage, getChatWithMessages } from "@webld/server";
import { auth } from "@webld/server/auth";

import { DashboardChatPage, DashboardNewChatPage } from "./components/dashboard-chat-page";

const chatIdSchema = z.uuid();

type ChatPageProps = {
	searchParams: Promise<{ chatId?: string | string[] }>;
};

export default async function ChatPage({ searchParams }: ChatPageProps) {
	const { chatId: requestedChatId } = await searchParams;
	const parsedChatId = chatIdSchema.safeParse(requestedChatId);

	if (!parsedChatId.success) {
		return <DashboardNewChatPage />;
	}

	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		throw new Error("No session found");
	}

	const organizationId = session.session.activeOrganizationId;

	if (!organizationId) {
		throw new Error("No active workspace found");
	}

	const chatId = parsedChatId.data;
	const existingChat = await getChatWithMessages({ chatId, organizationId });
	const initialMessages = existingChat ? convertDbMessagesForUI<DashboardChatUIMessage>(existingChat.messages) : [];

	return <DashboardChatPage key={chatId} chatId={chatId} initialMessages={initialMessages} />;
}
