"use client";

import { useEffect } from "react";

import { type UseChatHelpers } from "@ai-sdk/react";
import { type DataUIPart } from "ai";
import { lastAssistantMessageIsCompleteWithApprovalResponses, lastAssistantMessageIsCompleteWithToolCalls } from "ai";

import type { BaseChatUIMessage } from "@starter/server";

export type UseAutoResumeParams<TMessage extends BaseChatUIMessage = BaseChatUIMessage> = {
	autoResume: boolean;
	initialMessages: TMessage[];
	data: DataUIPart<Record<string, unknown>>[];
	resumeStream: UseChatHelpers<TMessage>["resumeStream"];
	setMessages: UseChatHelpers<TMessage>["setMessages"];
};

export const useAutoResume = <TMessage extends BaseChatUIMessage = BaseChatUIMessage>({
	autoResume,
	initialMessages,
	data,
	resumeStream,
	setMessages,
}: UseAutoResumeParams<TMessage>) => {
	useEffect(() => {
		if (!autoResume) return;

		const mostRecentMessage = initialMessages.at(-1);
		const shouldResumeAssistantContinuation =
			mostRecentMessage?.role === "assistant" &&
			(lastAssistantMessageIsCompleteWithToolCalls({ messages: [mostRecentMessage] }) ||
				lastAssistantMessageIsCompleteWithApprovalResponses({ messages: [mostRecentMessage] }));

		if (mostRecentMessage?.role === "user" || shouldResumeAssistantContinuation) {
			resumeStream();
		}

		// oxlint-disable-next-line eslint-plugin-react-hooks/exhaustive-deps
	}, []);

	/*
	 * For when the generation is streaming during SSR
	 * but the resumable stream has concluded at this point.
	 * Initial messages won't include the most recent message since that is fetched during SSR.
	 * We append it manually here when we receive the data-append-message from the [id]/stream/route.ts
	 */
	useEffect(() => {
		if (!data || data.length === 0) return;

		const dataPart = data[0];

		if (dataPart.type === "data-append-message") {
			try {
				const message = JSON.parse(dataPart.data as string) as TMessage;
				setMessages((currentMessages) => {
					if (currentMessages.some((currentMessage) => currentMessage.id === message.id)) {
						return currentMessages;
					}

					return [...currentMessages, message];
				});
			} catch {
				// Ignore malformed resumable payloads instead of crashing the client.
			}
		}
	}, [data, setMessages]);
};
