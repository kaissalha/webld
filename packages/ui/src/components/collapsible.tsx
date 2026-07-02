"use client";

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

import { cn } from "@webld/ui/lib/utils";

const Collapsible = ({ ...props }: CollapsiblePrimitive.Root.Props) => {
	return <CollapsiblePrimitive.Root data-slot='collapsible' {...props} />;
};

const CollapsibleTrigger = ({ className, ...props }: CollapsiblePrimitive.Trigger.Props) => {
	return (
		<CollapsiblePrimitive.Trigger
			data-slot='collapsible-trigger'
			className={cn("cursor-pointer", className)}
			{...props}
		/>
	);
};

const CollapsiblePanel = ({ className, ...props }: CollapsiblePrimitive.Panel.Props) => {
	return (
		<CollapsiblePrimitive.Panel
			data-slot='collapsible-panel'
			className={cn(
				"h-(--collapsible-panel-height) animate-none overflow-hidden transition-[height_200ms_ease-out] data-ending-style:h-0 data-starting-style:h-0",
				className
			)}
			{...props}
		/>
	);
};

export { Collapsible, CollapsibleTrigger, CollapsiblePanel, CollapsiblePanel as CollapsibleContent };
