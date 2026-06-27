"use client";

import { useEffect, useRef } from "react";

import { BrainIcon, ChevronDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@webld/ui/components/collapsible";
import { Loader } from "@webld/ui/components/loader";
import { TextShimmer } from "@webld/ui/components/text-shimmer";
import { cn } from "@webld/ui/lib/utils";

import { ChatMessageMarkdown } from "../chat-message-markdown";
import { useReasoningState } from "./use-reasoning-state";

export type ReasoningPartProps = {
	text: string;
	state?: "streaming" | "done";
	isStreaming?: boolean;
};

export const ReasoningPart = ({ text, state, isStreaming = false }: ReasoningPartProps) => {
	const t = useTranslations("components.chat.message.reasoning");
	const isThinking = state === "streaming" || (state === undefined && isStreaming);
	const { open, onOpenChange, durationSeconds } = useReasoningState({ isThinking });
	const contentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isThinking && contentRef.current) {
			contentRef.current.scrollTop = contentRef.current.scrollHeight;
		}
	}, [text, isThinking]);

	const label = isThinking
		? t("thinking")
		: durationSeconds
			? t("thoughtFor", { seconds: durationSeconds })
			: t("reasoning");

	return (
		<Collapsible open={open} onOpenChange={onOpenChange} className='my-1 w-full'>
			<CollapsibleTrigger
				className={cn(
					"group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/50",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				)}
			>
				{isThinking ? (
					<Loader size={15} className='text-muted-foreground' />
				) : (
					<BrainIcon className='size-4 shrink-0 text-muted-foreground' />
				)}
				{isThinking ? (
					<TextShimmer className='flex-1 text-start font-medium text-muted-foreground'>{label}</TextShimmer>
				) : (
					<span className='flex-1 text-start text-muted-foreground'>{label}</span>
				)}
				<ChevronDownIcon className='size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-panel-open:rotate-180' />
			</CollapsibleTrigger>
			<CollapsibleContent>
				{text.trim().length > 0 && (
					<div
						ref={contentRef}
						className='mt-1 ms-3.5 max-h-72 overflow-y-auto border-s border-border/60 ps-3.5 text-sm text-muted-foreground'
					>
						<ChatMessageMarkdown streaming={isThinking}>{text}</ChatMessageMarkdown>
					</div>
				)}
			</CollapsibleContent>
		</Collapsible>
	);
};

ReasoningPart.displayName = "ReasoningPart";
