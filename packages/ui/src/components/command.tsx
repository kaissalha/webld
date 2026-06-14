"use client";

import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { SearchIcon } from "lucide-react";

import {
	AutocompleteEmpty,
	AutocompleteGroup,
	AutocompleteGroupLabel,
	AutocompleteItem,
	AutocompleteList,
	AutocompleteSeparator,
	AutocompleteCollection as CommandCollection,
} from "@webld/ui/components/autocomplete";
import { DialogBackdrop } from "@webld/ui/components/dialog";
import { Input } from "@webld/ui/components/input";
import { cn } from "@webld/ui/lib/utils";

const Command = ({
	autoHighlight = "always",
	keepHighlight = true,
	open = true,
	...props
}: AutocompletePrimitive.Root.Props<unknown>) => {
	return (
		<AutocompletePrimitive.Root
			autoHighlight={autoHighlight}
			keepHighlight={keepHighlight}
			open={open}
			{...props}
		/>
	);
};

const CommandInput = ({ className, ...props }: AutocompletePrimitive.Input.Props) => {
	return (
		<AutocompletePrimitive.Input
			data-slot='command-input'
			className={cn("border-b", className)}
			render={<Input size='lg' className='rounded-none rounded-t-lg border-none ring-0 focus-within:ring-0' />}
			{...props}
		>
			<span className='absolute inset-s-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg:not([class*="size-"])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0'>
				<SearchIcon />
			</span>
		</AutocompletePrimitive.Input>
	);
};

const CommandList = ({ className, ...props }: AutocompletePrimitive.List.Props) => {
	return <AutocompleteList className={cn("not-empty:p-1", className)} {...props} />;
};

const CommandEmpty = ({ className, ...props }: AutocompletePrimitive.Empty.Props) => {
	return <AutocompleteEmpty className={cn("py-6 text-center text-sm", className)} {...props} />;
};

const CommandItem = ({ className, ...props }: AutocompletePrimitive.Item.Props) => {
	return (
		<AutocompleteItem
			data-slot='command-item'
			className={cn(
				"relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className
			)}
			{...props}
		/>
	);
};

const CommandGroup = ({ className, ...props }: AutocompletePrimitive.Group.Props) => {
	return (
		<AutocompleteGroup
			className={cn(
				"overflow-hidden p-1 text-foreground **:data-[slot=command-group-label]:px-2 **:data-[slot=command-group-label]:py-1.5 **:data-[slot=command-group-label]:text-xs **:data-[slot=command-group-label]:font-medium **:data-[slot=command-group-label]:text-muted-foreground",
				className
			)}
			{...props}
		/>
	);
};

const CommandGroupLabel = ({ className, ...props }: AutocompletePrimitive.GroupLabel.Props) => {
	return (
		<AutocompleteGroupLabel
			data-slot='command-group-label'
			className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)}
			{...props}
		/>
	);
};

const CommandSeparator = ({ className, ...props }: AutocompletePrimitive.Separator.Props) => {
	return <AutocompleteSeparator className={cn("my-1 -mx-1 h-px bg-border", className)} {...props} />;
};

const CommandShortcut = ({ className, ...props }: React.ComponentProps<"span">) => {
	return (
		<span
			data-slot='command-shortcut'
			className={cn("ms-auto text-xs tracking-widest text-muted-foreground", className)}
			{...props}
		/>
	);
};

const CommandFooter = ({ className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div
			data-slot='command-footer'
			className={cn("flex items-center gap-2 border-t px-3 py-2 text-xs text-muted-foreground", className)}
			{...props}
		/>
	);
};

const CommandPanel = ({ className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div
			data-slot='command-panel'
			className={cn("overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg", className)}
			{...props}
		/>
	);
};

const CommandDialog = DialogPrimitive.Root;

const CommandDialogTrigger = (props: DialogPrimitive.Trigger.Props) => {
	return <DialogPrimitive.Trigger data-slot='command-dialog-trigger' {...props} />;
};

const CommandDialogPopup = ({ className, children, ...props }: DialogPrimitive.Popup.Props) => {
	return (
		<DialogPrimitive.Portal>
			<DialogBackdrop />
			<div className='fixed inset-0 z-50 flex items-start justify-center pt-[20vh]'>
				<DialogPrimitive.Popup
					data-slot='command-dialog-popup'
					className={cn(
						"w-full max-w-lg overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl transition-[scale,opacity] duration-200 data-ending-style:opacity-0 data-ending-style:scale-98 data-starting-style:opacity-0 data-starting-style:scale-98",
						className
					)}
					{...props}
				>
					{children}
				</DialogPrimitive.Popup>
			</div>
		</DialogPrimitive.Portal>
	);
};

export {
	Command,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandItem,
	CommandGroup,
	CommandGroupLabel,
	CommandSeparator,
	CommandShortcut,
	CommandFooter,
	CommandPanel,
	CommandDialog,
	CommandDialogTrigger,
	CommandDialogPopup,
	CommandCollection,
};
