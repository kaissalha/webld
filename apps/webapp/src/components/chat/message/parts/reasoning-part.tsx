"use client";

import { useState } from "react";

import { BrainIcon, ChevronDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@webld/ui/components/collapsible";
import { cn } from "@webld/ui/lib/utils";

export type ReasoningPartProps = {
	text: string;
	isStreaming?: boolean;
};

export const ReasoningPart = ({ text, isStreaming = false }: ReasoningPartProps) => {
	const t = useTranslations("chats");
	const [isExpanded, setIsExpanded] = useState(false);
	const isOpen = isStreaming || isExpanded;

	return (
		<Collapsible open={isOpen} onOpenChange={setIsExpanded}>
			<CollapsibleTrigger
				className={cn(
					"flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors",
					"hover:bg-muted/50",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				)}
			>
				<BrainIcon className={cn("size-4", isStreaming && "animate-pulse")} />
				<span className='flex-1 text-start'>{t("viewReasoning")}</span>
				<ChevronDownIcon className={cn("size-4 transition-transform duration-200", isOpen && "rotate-180")} />
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className='mt-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-3'>
					<p className='whitespace-pre-wrap text-sm text-muted-foreground'>{text}</p>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
};

ReasoningPart.displayName = "ReasoningPart";
