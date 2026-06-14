"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import { cn } from "@starter/ui/lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = (props: PopoverPrimitive.Trigger.Props) => {
	return <PopoverPrimitive.Trigger data-slot='popover-trigger' {...props} />;
};

const PopoverPopup = ({
	children,
	className,
	side = "bottom",
	align = "center",
	sideOffset = 4,
	anchor,
	...props
}: PopoverPrimitive.Popup.Props & {
	side?: PopoverPrimitive.Positioner.Props["side"];
	align?: PopoverPrimitive.Positioner.Props["align"];
	sideOffset?: PopoverPrimitive.Positioner.Props["sideOffset"];
	anchor?: PopoverPrimitive.Positioner.Props["anchor"];
}) => {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Positioner
				data-slot='popover-positioner'
				className='z-50'
				side={side}
				sideOffset={sideOffset}
				align={align}
				anchor={anchor}
			>
				<span className='relative flex origin-(--transform-origin) rounded-lg border bg-popover bg-clip-padding transition-[scale,opacity] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-lg has-data-starting-style:scale-98 has-data-starting-style:opacity-0 dark:bg-clip-border dark:shadow-lg dark:shadow-black/24 dark:before:shadow-[0_-1px_--theme(--color-white/8%)]'>
					<PopoverPrimitive.Popup
						data-slot='popover-content'
						className={cn("max-h-(--available-height) min-w-80 overflow-y-auto p-4", className)}
						{...props}
					>
						{children}
					</PopoverPrimitive.Popup>
				</span>
			</PopoverPrimitive.Positioner>
		</PopoverPrimitive.Portal>
	);
};

const PopoverClose = ({ ...props }: PopoverPrimitive.Close.Props) => {
	return <PopoverPrimitive.Close data-slot='popover-close' {...props} />;
};

const PopoverTitle = ({ className, ...props }: PopoverPrimitive.Title.Props) => {
	return (
		<PopoverPrimitive.Title
			data-slot='popover-title'
			className={cn("text-lg leading-none font-semibold", className)}
			{...props}
		/>
	);
};

const PopoverDescription = ({ className, ...props }: PopoverPrimitive.Description.Props) => {
	return (
		<PopoverPrimitive.Description
			data-slot='popover-description'
			className={cn("text-sm text-muted-foreground", className)}
			{...props}
		/>
	);
};

const PopoverItem = ({
	className,
	selected,
	disabled,
	...props
}: React.ComponentProps<"div"> & { selected?: boolean; disabled?: boolean }) => (
	<div
		className={cn(
			"outline-hidden relative flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground has-[>svg:first-child]:ps-2 has-[>svg:last-child]:pe-2 [&_svg:not([class*='size-'])]:size-5",
			selected ? "bg-accent text-foreground" : "text-muted-foreground",
			disabled ? "pointer-events-none opacity-50" : "",
			className
		)}
		{...props}
	/>
);

export {
	Popover,
	PopoverTrigger,
	PopoverPopup,
	PopoverPopup as PopoverContent,
	PopoverTitle,
	PopoverItem,
	PopoverDescription,
	PopoverClose,
};
