import type * as React from "react";

import { cn } from "@webld/ui/lib/utils";

const Frame = ({ className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div
			data-slot='frame'
			className={cn(
				"group relative flex flex-col overflow-hidden rounded-sm border border-border bg-card p-1 transition-[background-color,box-shadow] duration-200 ease-out hover:bg-card",
				className
			)}
			{...props}
		/>
	);
};

const FramePanel = ({ className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div
			data-slot='frame-panel'
			className={cn(
				"min-w-0 rounded-[calc(theme(borderRadius.sm)-2px)] border border-border bg-background p-4",
				className
			)}
			{...props}
		/>
	);
};

const FrameHeader = ({ className, ...props }: React.ComponentProps<"header">) => {
	return (
		<header data-slot='frame-panel-header' className={cn("flex flex-col gap-1 px-4 py-4", className)} {...props} />
	);
};

const FrameHeading = ({ className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div data-slot='frame-panel-heading' className={cn("flex min-w-0 items-center gap-2", className)} {...props} />
	);
};

const FrameIcon = ({ className, ...props }: React.ComponentProps<"span">) => {
	return (
		<span
			data-slot='frame-panel-icon'
			className={cn(
				"shrink-0 text-muted-foreground transition-colors duration-200 ease-out group-hover:text-foreground",
				className
			)}
			{...props}
		/>
	);
};

const FrameTitle = ({ className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div
			data-slot='frame-panel-title'
			className={cn("text-sm font-medium text-muted-foreground", className)}
			{...props}
		/>
	);
};

const FrameDescription = ({ className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div
			data-slot='frame-panel-description'
			className={cn("text-sm text-muted-foreground", className)}
			{...props}
		/>
	);
};

const FrameFooter = ({ className, ...props }: React.ComponentProps<"footer">) => {
	return (
		<footer
			data-slot='frame-panel-footer'
			className={cn("flex flex-col gap-1 px-4 pb-4 pt-3", className)}
			{...props}
		/>
	);
};

export { Frame, FramePanel, FrameHeader, FrameHeading, FrameIcon, FrameTitle, FrameDescription, FrameFooter };
