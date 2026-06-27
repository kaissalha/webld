"use client";

import type { ComponentProps, ReactNode } from "react";

import { ChevronDownIcon } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@webld/ui/components/collapsible";
import { cn } from "@webld/ui/lib/utils";

export const Task = ({ className, ...props }: ComponentProps<typeof Collapsible>) => {
	return <Collapsible className={cn("w-full", className)} {...props} />;
};

export const TaskTrigger = ({
	className,
	icon,
	children,
	...props
}: ComponentProps<typeof CollapsibleTrigger> & { icon?: ReactNode }) => {
	return (
		<CollapsibleTrigger
			className={cn(
				"group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors",
				"hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				className
			)}
			{...props}
		>
			{icon}
			<span className='min-w-0 flex-1 truncate text-start'>{children}</span>
			<ChevronDownIcon className='size-4 shrink-0 transition-transform duration-200 group-data-panel-open:rotate-180' />
		</CollapsibleTrigger>
	);
};

export const TaskContent = ({ className, children, ...props }: ComponentProps<typeof CollapsibleContent>) => {
	return (
		<CollapsibleContent className={className} {...props}>
			<div className='ms-3.5 mt-1 flex flex-col gap-1.5 border-s border-border/60 ps-3.5 py-1'>{children}</div>
		</CollapsibleContent>
	);
};

export const TaskItem = ({ className, ...props }: ComponentProps<"div">) => {
	return <div className={cn("text-sm text-muted-foreground", className)} {...props} />;
};

export const TaskItemFile = ({ className, ...props }: ComponentProps<"span">) => {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-xs text-foreground",
				className
			)}
			{...props}
		/>
	);
};
