import { headers } from "next/headers";

import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { convertDbMessagesForUI } from "@/utils/chat-utils";
import { getChat, getChatMessagesFromDb, type DashboardChatUIMessage } from "@webld/server";
import { auth } from "@webld/server/auth";

import { DashboardChatPage } from "./components/dashboard-chat-page";

const chatIdSchema = z.uuid();

export default async function ChatPage({
	searchParams,
}: {
	searchParams: Promise<{ chat?: string | string[] | undefined }>;
}) {
	const [resolvedSearchParams, headersObj] = await Promise.all([searchParams, headers()]);
	const session = await auth.api.getSession({
		headers: headersObj,
	});

	if (!session) {
		throw new Error("No session found");
	}

	const organizationId = session.session.activeOrganizationId;

	if (!organizationId) {
		throw new Error("No active workspace found");
	}

	const requestedChatId = Array.isArray(resolvedSearchParams.chat)
		? resolvedSearchParams.chat[0]
		: resolvedSearchParams.chat;
	const parsedChatId = chatIdSchema.safeParse(requestedChatId);
	const chatId = parsedChatId.success ? parsedChatId.data : uuidv4();
	let initialMessages: DashboardChatUIMessage[] = [];

	if (parsedChatId.success) {
		const existingChat = await getChat(chatId, organizationId);

		if (existingChat) {
			const messagesFromDb = await getChatMessagesFromDb({
				chatId,
				organizationId,
			});
			initialMessages = convertDbMessagesForUI<DashboardChatUIMessage>(messagesFromDb);
		}
	}

	return <DashboardChatPage chatId={chatId} initialMessages={initialMessages} />;
}
