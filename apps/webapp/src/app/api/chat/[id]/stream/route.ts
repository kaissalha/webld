import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { handleResumeStream } from "@/utils/chat-utils";
import { cancelStream, getChat, getStreamIdsByChatId, type DashboardChatUIMessage } from "@webld/server";
import { auth } from "@webld/server/auth";

export const GET = handleResumeStream<DashboardChatUIMessage>;

export const DELETE = async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
	const [{ id: chatId }, session] = await Promise.all([params, auth.api.getSession({ headers: await headers() })]);

	if (!session) {
		return new NextResponse("User not authenticated", { status: 401 });
	}

	if (!chatId) {
		return new NextResponse("id is required", { status: 400 });
	}

	const organizationId = session.session.activeOrganizationId;

	if (!organizationId) {
		return new NextResponse("Organization not found", { status: 400 });
	}

	const chat = await getChat(chatId, organizationId);

	if (!chat) {
		return new NextResponse("Access to chat forbidden", { status: 403 });
	}

	const streamIds = await getStreamIdsByChatId({ chatId });
	const recentStreamId = streamIds.at(-1);

	if (recentStreamId) {
		await cancelStream({ streamId: recentStreamId });
	}

	return new NextResponse(null, { status: 200 });
};
