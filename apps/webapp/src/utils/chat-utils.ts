import { cache } from "react";

import { headers } from "next/headers";
import { after, type NextRequest, NextResponse } from "next/server";

import { createUIMessageStream, JsonToSseTransformStream } from "ai";
import { differenceInSeconds, formatISO } from "date-fns";
import { createResumableStreamContext } from "resumable-stream/ioredis";

import { createTCPRedisClient } from "@webld/cache";
import type { DbChatMessage } from "@webld/db";
import type { BaseChatUIMessage } from "@webld/server";
import { getChatMessagesFromDb, getStreamIdsByChatId } from "@webld/server";
import { auth } from "@webld/server/auth";

if (!process.env.REDIS_URL) {
	throw new Error("REDIS_URL is not set");
}

export const streamContext = createResumableStreamContext({
	waitUntil: after,
	keyPrefix: "resumable-stream",
	publisher: createTCPRedisClient(process.env.REDIS_URL),
	subscriber: createTCPRedisClient(process.env.REDIS_URL),
});

export const convertDbMessagesForUI = cache(
	<TMessage extends BaseChatUIMessage>(messages: DbChatMessage[]): TMessage[] => {
		return messages.map<TMessage>(
			(message) =>
				({
					id: message.id,
					role: message.role as TMessage["role"],
					parts: message.parts as TMessage["parts"],
					metadata: {
						createdAt: formatISO(message.createdAt),
					},
				}) as TMessage
		);
	}
);

/**
 * Shared handler for resuming chat streams.
 * Used by chat stream routes.
 */
export const handleResumeStream = async <TMessage extends BaseChatUIMessage>(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) => {
	const [{ id: chatId }, session] = await Promise.all([params, auth.api.getSession({ headers: await headers() })]);

	const resumeRequestedAt = new Date();

	if (!session) {
		return new NextResponse("User not authenticated", { status: 401 });
	}

	if (!chatId) {
		return new NextResponse("id is required", { status: 400 });
	}

	const orgId = session.session.activeOrganizationId;

	if (!orgId) {
		return new NextResponse("Organization not found", { status: 400 });
	}

	const streamIds = await getStreamIdsByChatId({ chatId });

	if (!streamIds.length) {
		return new NextResponse("No streams found", { status: 404 });
	}

	const recentStreamId = streamIds.at(-1);

	if (!recentStreamId) {
		return new NextResponse("No recent stream found", { status: 404 });
	}

	const emptyDataStream = createUIMessageStream<TMessage>({
		// Empty stream used as fallback when no active stream exists
		execute: () => undefined,
	});

	const stream = await streamContext.resumableStream(recentStreamId, () =>
		emptyDataStream.pipeThrough(new JsonToSseTransformStream())
	);

	/*
	 * For when the generation is streaming during SSR
	 * but the resumable stream has concluded at this point.
	 * Initial messages won't include the most recent message since that is fetched during SSR.
	 * We send the most recent message to the client so that it can be appended to the initial messages.
	 */
	if (!stream) {
		const messages = await getChatMessagesFromDb({ chatId, organizationId: orgId });
		const mostRecentMessage = messages.at(-1);

		if (!mostRecentMessage) {
			return new NextResponse(emptyDataStream.pipeThrough(new JsonToSseTransformStream()), { status: 200 });
		}

		if (mostRecentMessage.role !== "assistant") {
			return new NextResponse(emptyDataStream.pipeThrough(new JsonToSseTransformStream()), { status: 200 });
		}

		const messageCreatedAt = new Date(mostRecentMessage.createdAt);

		if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
			return new NextResponse(emptyDataStream.pipeThrough(new JsonToSseTransformStream()), { status: 200 });
		}

		const restoredStream = createUIMessageStream<TMessage>({
			execute: ({ writer }) => {
				// Custom data type for appending a message when stream has concluded
				// but the message was recently created (within 15 seconds)
				writer.write({
					type: "data-append-message",
					data: JSON.stringify(mostRecentMessage),
					transient: true,
				} as Parameters<typeof writer.write>[0]);
			},
		});

		return new NextResponse(restoredStream.pipeThrough(new JsonToSseTransformStream()), { status: 200 });
	}

	return new NextResponse(stream, { status: 200 });
};
