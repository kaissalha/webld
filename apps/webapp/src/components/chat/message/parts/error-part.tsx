"use client";

import { TriangleAlertIcon } from "lucide-react";

import { ChatMessageMarkdown } from "../chat-message-markdown";

export type ErrorPartProps = {
	message: string;
};

export const ErrorPart = ({ message }: ErrorPartProps) => {
	return (
		<div className='flex w-fit max-w-full items-center gap-3 rounded-2xl bg-destructive/10 px-4 py-3 text-destructive'>
			<TriangleAlertIcon />
			<ChatMessageMarkdown>{message}</ChatMessageMarkdown>
		</div>
	);
};

ErrorPart.displayName = "ErrorPart";
