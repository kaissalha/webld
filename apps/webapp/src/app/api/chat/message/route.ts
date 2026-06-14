import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { z } from "zod";

import { withErrorHandler } from "@/utils/with-error-handler";
import { getChat, type BaseChatUIMessage, saveOrUpdateChatMessage } from "@starter/server";
import { auth } from "@starter/server/auth";

const saveMessageSchema = z.object({
	chatId: z.string().uuid(),
	message: z.looseObject({}),
});

/**
 * Save a message without AI response - useful for practitioner notes
 */
export const POST = withErrorHandler(async (req: Request) => {
	const [body, session] = await Promise.all([req.json(), auth.api.getSession({ headers: await headers() })]);

	if (!session) {
		return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
	}

	const organizationId = session.session.activeOrganizationId;

	if (!organizationId) {
		return NextResponse.json({ error: "Organization not found" }, { status: 400 });
	}

	const parseResult = saveMessageSchema.safeParse(body);

	if (!parseResult.success) {
		return NextResponse.json({ error: "Invalid request data", details: parseResult.error.issues }, { status: 400 });
	}

	const { chatId, message } = parseResult.data;
	const chat = await getChat(chatId, organizationId);

	if (!chat) {
		return NextResponse.json({ error: "Access to chat forbidden" }, { status: 403 });
	}

	await saveOrUpdateChatMessage(chatId, message as unknown as BaseChatUIMessage);

	return NextResponse.json({ success: true });
});
