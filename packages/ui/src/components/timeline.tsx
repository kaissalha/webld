import type * as React from "react";

import { CheckIcon, ChevronDownIcon, ChevronRightIcon, LoaderIcon } from "lucide-react";

import { cn } from "@starter/ui/lib/utils";

const Timeline = ({ className, ...props }: React.ComponentProps<"div">) => {
	return <div data-slot='timeline' className={cn("relative w-full", className)} {...props} />;
};

type TimelineHeaderProps = React.ComponentProps<"div"> & {
	name?: string;
	query?: string;
	timestamp?: string;
	expanded?: boolean;
	onToggle?: () => void;
};

const TimelineHeader = ({ className, name, query, timestamp, expanded, onToggle, ...props }: TimelineHeaderProps) => {
	return (
		<div
			data-slot='timeline-header'
			className={cn("flex items-center justify-between py-3", onToggle && "cursor-pointer", className)}
			onClick={onToggle}
			{...props}
		>
			<div className='flex items-center gap-1.5 text-sm'>
				{onToggle && (
					<ChevronDownIcon
						className={cn(
							"h-4 w-4 text-muted-foreground transition-transform duration-200",
							!expanded && "-rotate-90"
						)}
					/>
				)}
				{name && <span className='font-medium text-foreground'>{name}</span>}
				{name && query && <span className='text-muted-foreground'>asked</span>}
				{query && <span className='text-muted-foreground'>&ldquo;{query}&rdquo;</span>}
			</div>
			{timestamp && <time className='text-xs text-muted-foreground tabular-nums'>{timestamp}</time>}
		</div>
	);
};

type TimelineStatusProps = React.ComponentProps<"div"> & {
	status?: string;
	remaining?: string;
	loading?: boolean;
};

const TimelineStatus = ({ className, status, remaining, loading = false, ...props }: TimelineStatusProps) => {
	return (
		<div
			data-slot='timeline-status'
			className={cn(
				"flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 mb-4",
				className
			)}
			{...props}
		>
			<div className='flex items-center gap-2.5'>
				{loading && <LoaderIcon className='h-4 w-4 animate-spin text-muted-foreground' />}
				{status && <span className='text-sm font-medium'>{status}</span>}
			</div>
			{remaining && (
				<span className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>{remaining}</span>
			)}
		</div>
	);
};

const TimelineItems = ({ className, ...props }: React.ComponentProps<"ol">) => {
	return <ol data-slot='timeline-items' className={cn("relative list-none space-y-0", className)} {...props} />;
};

const TimelineItem = ({ className, ...props }: React.ComponentProps<"li">) => {
	return <li data-slot='timeline-item' className={cn("relative flex gap-3.5 group/item", className)} {...props} />;
};

type TimelineMarkerStatus = "pending" | "active" | "completed" | "loading";

type TimelineMarkerProps = React.ComponentProps<"div"> & {
	status?: TimelineMarkerStatus;
	completed?: boolean;
	hasLine?: boolean;
};

const TimelineMarker = ({ className, status, completed, hasLine = true, children, ...props }: TimelineMarkerProps) => {
	const resolvedStatus = status ?? (completed ? "completed" : "pending");

	return (
		<div
			data-slot='timeline-marker'
			className={cn("relative flex flex-col items-center self-stretch", className)}
			{...props}
		>
			<div
				className={cn(
					"relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted",
					resolvedStatus === "active" && "border-2 border-dashed border-muted-foreground/40",
					resolvedStatus === "loading" && "border-2 border-dashed border-muted-foreground/40"
				)}
			>
				{children ?? (
					<>
						{resolvedStatus === "completed" && (
							<CheckIcon className='h-3.5 w-3.5 text-foreground/70' strokeWidth={2.5} />
						)}
						{(resolvedStatus === "active" || resolvedStatus === "loading") && (
							<div className='h-1.5 w-1.5 rounded-full bg-muted-foreground/50' />
						)}
						{resolvedStatus === "loading" && (
							<LoaderIcon className='absolute h-4 w-4 animate-spin text-muted-foreground/60' />
						)}
					</>
				)}
			</div>
			{hasLine && <div className='flex-1 w-px bg-muted group-last/item:hidden' />}
		</div>
	);
};

const TimelineContent = ({ className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div
			data-slot='timeline-content'
			className={cn("flex-1 flex flex-col gap-1 pb-10 pt-1", className)}
			{...props}
		/>
	);
};

type TimelineTitleProps = React.ComponentProps<"h3"> & {
	label?: string;
	onClick?: () => void;
};

const TimelineTitle = ({ className, label, onClick, children, ...props }: TimelineTitleProps) => {
	return (
		<h3
			data-slot='timeline-title'
			className={cn(
				"text-base font-medium leading-normal flex flex-row items-center gap-2",
				onClick && "cursor-pointer hover:underline",
				className
			)}
			onClick={onClick}
			{...props}
		>
			{label && <span className='text-muted-foreground'>{label}</span>}
			{children}
			{onClick && <ChevronRightIcon className='w-4 h-4 text-muted-foreground' />}
		</h3>
	);
};

type TimelineBadgeProps = React.ComponentProps<"span"> & {
	variant?: "default" | "mono";
};

const TimelineBadge = ({ className, variant = "default", ...props }: TimelineBadgeProps) => {
	return (
		<span
			data-slot='timeline-badge'
			className={cn(
				"inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-sm",
				variant === "mono" && "font-mono text-xs",
				className
			)}
			{...props}
		/>
	);
};

const TimelineSubItems = ({ className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div
			data-slot='timeline-sub-items'
			className={cn("mt-3 space-y-0 rounded-lg border border-border bg-card p-1", className)}
			{...props}
		/>
	);
};

type TimelineSubItemStatus = "pending" | "completed" | "loading";

type TimelineSubItemProps = React.ComponentProps<"div"> & {
	status?: TimelineSubItemStatus;
};

const TimelineSubItem = ({ className, status = "pending", children, ...props }: TimelineSubItemProps) => {
	return (
		<div
			data-slot='timeline-sub-item'
			className={cn("flex items-start gap-2.5 rounded-md px-3 py-2", className)}
			{...props}
		>
			<div className='flex h-5 w-5 shrink-0 items-center justify-center'>
				{status === "completed" && (
					<div className='flex h-4 w-4 items-center justify-center rounded-full bg-muted'>
						<CheckIcon className='h-2.5 w-2.5 text-muted-foreground' strokeWidth={3} />
					</div>
				)}
				{status === "loading" && <LoaderIcon className='h-3.5 w-3.5 animate-spin text-muted-foreground' />}
				{status === "pending" && <div className='h-1.5 w-1.5 rounded-full bg-muted-foreground/40' />}
			</div>
			<div className='flex flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground'>
				{children}
			</div>
		</div>
	);
};

const TimelineDescription = ({ className, ...props }: React.ComponentProps<"p">) => {
	return (
		<p
			data-slot='timeline-description'
			className={cn("text-sm text-muted-foreground leading-relaxed", className)}
			{...props}
		/>
	);
};

const TimelineTime = ({ className, ...props }: React.ComponentProps<"time">) => {
	return (
		<time
			data-slot='timeline-time'
			className={cn("text-sm text-muted-foreground tabular-nums", className)}
			{...props}
		/>
	);
};

export {
	Timeline,
	TimelineHeader,
	TimelineStatus,
	TimelineItems,
	TimelineItem,
	TimelineMarker,
	TimelineContent,
	TimelineTitle,
	TimelineBadge,
	TimelineSubItems,
	TimelineSubItem,
	TimelineDescription,
	TimelineTime,
};
