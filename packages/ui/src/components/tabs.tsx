"use client";

import * as React from "react";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

const Tabs = TabsPrimitive.Root;

const TabContext = React.createContext<{
	variant?: "tab" | "toggle" | null;
	size?: "sm" | "md" | "lg" | null;
}>({});

const tabListVariants = cva("items-center", {
	variants: {
		variant: {
			tab: "no-scrollbar relative flex w-full flex-nowrap gap-5 md:gap-7 overflow-x-auto px-5 after:absolute after:bottom-0 after:start-0 after:h-0.25 after:w-full after:bg-border",
			toggle: "grid w-auto auto-cols-auto grid-flow-col rounded-xl bg-muted",
		},
		size: {
			sm: "rounded-xl",
			md: "rounded-2xl",
			lg: "rounded-2xl",
		},
	},
	defaultVariants: {
		variant: "tab",
	},
});

const TabsList = ({
	ref,
	className,
	variant,
	...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabListVariants>) => (
	<TabContext.Provider value={{ variant }}>
		<TabsPrimitive.List ref={ref} className={cn(tabListVariants({ variant }), className)} {...props} />
	</TabContext.Provider>
);
TabsList.displayName = TabsPrimitive.List.displayName;

const tabTriggerVariants = cva(
	"focus-visible:outline-hidden inline-flex items-center justify-center whitespace-nowrap text-sm font-medium text-muted-foreground ring-offset-background transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-foreground data-[state=active]:text-foreground",
	{
		variants: {
			variant: {
				tab: "relative z-10 border-b border-transparent pb-3",
				toggle: "data-[state=active]:bg-background [&_svg:not([class*='size-'])]:size-5 [&_svg]:shrink-0",
			},
		},
		defaultVariants: {
			variant: "tab",
		},
	}
);

const TabsTrigger = ({
	ref,
	className,
	variant,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & VariantProps<typeof tabTriggerVariants>) => {
	const context = React.useContext(TabContext);
	return (
		<TabsPrimitive.Trigger
			ref={ref}
			className={cn(
				tabTriggerVariants({
					variant: variant || context.variant,
				}),
				className
			)}
			{...props}
		/>
	);
};
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = ({ ref, className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) => (
	<TabsPrimitive.Content ref={ref} className={cn("focus-visible:outline-hidden", className)} {...props} />
);
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
