import type * as React from "react";

import { cn } from "@webld/ui/lib/utils";

const Card = ({ className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div
			data-slot='card'
			className={cn("flex flex-col rounded-sm border border-border bg-card text-card-foreground", className)}
			{...props}
		/>
	);
};

const CardHeader = ({ className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div
			data-slot='card-header'
			className={cn(
				"flex flex-col gap-1 p-6 has-data-[slot=card-action]:flex-row has-data-[slot=card-action]:items-start has-data-[slot=card-action]:justify-between has-data-[slot=card-action]:gap-4 [.border-b]:pb-6",
				className
			)}
			{...props}
		/>
	);
};

const CardTitle = ({ className, ...props }: React.ComponentProps<"div">) => {
	return <div data-slot='card-title' className={cn("font-semibold", className)} {...props} />;
};

const CardDescription = ({ className, ...props }: React.ComponentProps<"div">) => {
	return <div data-slot='card-description' className={cn("text-sm text-muted-foreground", className)} {...props} />;
};

const CardAction = ({ className, ...props }: React.ComponentProps<"div">) => {
	return <div data-slot='card-action' className={cn("shrink-0", className)} {...props} />;
};

const CardPanel = ({ className, ...props }: React.ComponentProps<"div">) => {
	return <div data-slot='card-content' className={cn("px-6 pb-6", className)} {...props} />;
};

const CardFooter = ({ className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div
			data-slot='card-footer'
			className={cn(
				"flex items-center justify-between gap-4 border-t border-border bg-muted/30 px-6 py-4",
				className
			)}
			{...props}
		/>
	);
};

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardPanel, CardPanel as CardContent };
