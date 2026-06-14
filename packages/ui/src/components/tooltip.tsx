"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@starter/ui/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = (props: TooltipPrimitive.Trigger.Props) => {
	return <TooltipPrimitive.Trigger data-slot='tooltip-trigger' {...props} />;
};

const TooltipPopup = ({
	className,
	align = "center",
	sideOffset = 4,
	side = "top",
	children,
	...props
}: TooltipPrimitive.Popup.Props & {
	align?: TooltipPrimitive.Positioner.Props["align"];
	side?: TooltipPrimitive.Positioner.Props["side"];
	sideOffset?: TooltipPrimitive.Positioner.Props["sideOffset"];
}) => {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Positioner
				data-slot='tooltip-positioner'
				className='z-50'
				sideOffset={sideOffset}
				align={align}
				side={side}
			>
				<TooltipPrimitive.Popup
					data-slot='tooltip-content'
					className={cn(
						"relative flex w-fit origin-(--transform-origin) rounded-md border border-border bg-popover bg-clip-padding px-2 py-1 text-sm text-wrap text-popover-foreground shadow-md transition-[scale,opacity] data-ending-style:scale-98 data-ending-style:opacity-0 data-instant:duration-0 data-starting-style:scale-98 data-starting-style:opacity-0 max-w-xs dark:border-foreground/20 dark:bg-foreground dark:text-background",
						className
					)}
					{...props}
				>
					{children}
				</TooltipPrimitive.Popup>
			</TooltipPrimitive.Positioner>
		</TooltipPrimitive.Portal>
	);
};

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipPopup, TooltipPopup as TooltipContent };
