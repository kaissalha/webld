"use client";

import { useEffect, useRef } from "react";

import { BrainIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { TextShimmer } from "@webld/ui/components/text-shimmer";

import { ChatMessageMarkdown } from "../chat-message-markdown";
import { ChatStepItem } from "../chat-step-item";
import { useReasoningState } from "./use-reasoning-state";

export type ReasoningPartProps = {
	text: string;
	state?: "streaming" | "done";
	isStreaming?: boolean;
	isLast?: boolean;
};

const reasoningIcon = <BrainIcon className='size-3.5' />;

export const ReasoningPart = ({ text, state, isStreaming = false, isLast = false }: ReasoningPartProps) => {
	const t = useTranslations("components.chat.message.reasoning");
	const rawIsThinking = state === "streaming" || (state === undefined && isStreaming);
	const { open, onOpenChange, durationSeconds, isThinking } = useReasoningState({ isThinking: rawIsThinking });
	const contentRef = useRef<HTMLDivElement>(null);
	const hasText = text.trim().length > 0;

	useEffect(() => {
		if (isThinking && contentRef.current) {
			contentRef.current.scrollTop = contentRef.current.scrollHeight;
		}
	}, [text, isThinking]);

	const labelText = isThinking
		? t("thinking")
		: durationSeconds
			? t("thoughtFor", { seconds: durationSeconds })
			: t("reasoning");

	const label = isThinking ? <TextShimmer className='font-medium'>{labelText}</TextShimmer> : labelText;

	return (
		<ChatStepItem
			icon={reasoningIcon}
			label={label}
			status={isThinking ? "running" : "done"}
			isLast={isLast}
			open={open}
			onOpenChange={onOpenChange}
		>
			{hasText && (
				<div ref={contentRef} className='max-h-72 overflow-y-auto text-sm text-muted-foreground'>
					<ChatMessageMarkdown streaming={isThinking}>{text}</ChatMessageMarkdown>
				</div>
			)}
		</ChatStepItem>
	);
};

ReasoningPart.displayName = "ReasoningPart";
