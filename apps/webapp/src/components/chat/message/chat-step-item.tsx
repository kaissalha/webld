"use client";

import type { ReactNode } from "react";

import { ChevronDownIcon } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@webld/ui/components/collapsible";
import { Loader } from "@webld/ui/components/loader";
import { cn } from "@webld/ui/lib/utils";

export type ChatStepStatus = "running" | "done" | "error";

export type ChatStepItemProps = {
	icon: ReactNode;
	label: ReactNode;
	status: ChatStepStatus;
	isLast?: boolean;
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	action?: ReactNode;
	children?: ReactNode;
};

const StepIcon = ({ icon, status }: { icon: ReactNode; status: ChatStepStatus }) => {
	return (
		<span
			className={cn(
				"flex size-4 shrink-0 items-center justify-center",
				status === "error" ? "text-destructive" : "text-muted-foreground"
			)}
		>
			{status === "running" ? <Loader size={14} /> : icon}
		</span>
	);
};

export const ChatStepItem = ({
	icon,
	label,
	status,
	isLast = false,
	open,
	defaultOpen,
	onOpenChange,
	action,
	children,
}: ChatStepItemProps) => {
	const hasContent = Boolean(children);

	const rail = (
		<div className='flex flex-col items-center self-stretch'>
			<div className='flex h-7 items-center'>
				<StepIcon icon={icon} status={status} />
			</div>
			{!isLast && <span aria-hidden className='w-px flex-1 bg-border' />}
		</div>
	);

	if (!hasContent) {
		return (
			<div className='flex gap-3'>
				{rail}
				<div className={cn("min-w-0 flex-1", !isLast && "pb-3")}>
					<div className='flex h-7 items-center gap-1'>
						<span className='min-w-0 flex-1 truncate text-sm text-muted-foreground'>{label}</span>
						{action}
					</div>
				</div>
			</div>
		);
	}

	return (
		<Collapsible open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
			<div className='flex gap-3'>
				{rail}
				<div className={cn("min-w-0 flex-1", !isLast && "pb-3")}>
					<div className='flex h-7 items-center gap-1'>
						<CollapsibleTrigger
							className={cn(
								"group flex h-7 min-w-0 flex-1 items-center gap-2 rounded-lg text-sm text-muted-foreground transition-colors",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							)}
						>
							<span className='min-w-0 flex-1 truncate text-start'>{label}</span>
							<ChevronDownIcon className='size-4 shrink-0 transition-transform duration-200 group-data-panel-open:rotate-180' />
						</CollapsibleTrigger>
						{action}
					</div>
					<CollapsibleContent>{children}</CollapsibleContent>
				</div>
			</div>
		</Collapsible>
	);
};

ChatStepItem.displayName = "ChatStepItem";
