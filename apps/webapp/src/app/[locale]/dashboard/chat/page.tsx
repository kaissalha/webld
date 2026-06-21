import { headers } from "next/headers";

import { z } from "zod";

import { convertDbMessagesForUI } from "@/utils/chat-utils";
import { getChat, getChatMessagesFromDb, type DashboardChatUIMessage } from "@webld/server";
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
	let initialMessages: DashboardChatUIMessage[] = [];
	const existingChat = await getChat(chatId, organizationId);

	if (existingChat) {
		const messagesFromDb = await getChatMessagesFromDb({ chatId, organizationId });
		initialMessages = convertDbMessagesForUI<DashboardChatUIMessage>(messagesFromDb);
	}

	return <DashboardChatPage key={chatId} chatId={chatId} initialMessages={initialMessages} />;
}
