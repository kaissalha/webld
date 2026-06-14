"use client";

import { cn } from "@webld/ui/lib/utils";

import { ChatMessageMarkdown } from "../chat-message-markdown";

export type TextPartProps = {
	text: string;
	messageId: string;
	isUser: boolean;
	isAssistant: boolean;
	isStreaming?: boolean;
};

export const TextPart = ({ text, messageId, isUser, isAssistant, isStreaming = false }: TextPartProps) => {
	return (
		<div
			className={cn(
				"group relative max-w-full rounded-2xl  py-2 text-foreground",
				isUser ? "w-fit max-w-3/4 justify-end" : "w-full justify-start",
				isUser ? "bg-muted/50 px-4" : "bg-transparent"
			)}
		>
			<div className={cn("wrap-break-word", isAssistant && "pb-3")}>
				<ChatMessageMarkdown id={`${messageId}-text`} streaming={isStreaming}>
					{text}
				</ChatMessageMarkdown>
			</div>
		</div>
	);
};

TextPart.displayName = "TextPart";
