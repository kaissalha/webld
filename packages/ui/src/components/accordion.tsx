"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { MinusIcon, PlusIcon } from "lucide-react";

import { cn } from "@starter/ui/lib/utils";

const Accordion = (props: AccordionPrimitive.Root.Props) => {
	return <AccordionPrimitive.Root data-slot='accordion' {...props} />;
};

const AccordionItem = ({ className, ...props }: AccordionPrimitive.Item.Props) => {
	return <AccordionPrimitive.Item data-slot='accordion-item' className={cn("border-b", className)} {...props} />;
};

type AccordionTriggerProps = AccordionPrimitive.Trigger.Props & {
	hideIcon?: boolean;
};

const AccordionTrigger = ({ className, children, hideIcon, ...props }: AccordionTriggerProps) => {
	return (
		<AccordionPrimitive.Header className='flex'>
			<AccordionPrimitive.Trigger
				data-slot='accordion-trigger'
				className={cn(
					"group flex flex-1 cursor-pointer items-center justify-between gap-4 rounded-md py-4 text-start text-sm font-medium transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-64",
					className
				)}
				{...props}
			>
				{children}
				{!hideIcon && (
					<span className='relative size-4 shrink-0'>
						<PlusIcon
							className='absolute inset-0 size-4 transition-opacity duration-200 group-data-panel-open:opacity-0'
							strokeWidth={2}
						/>
						<MinusIcon
							className='absolute inset-0 size-4 opacity-0 transition-opacity duration-200 group-data-panel-open:opacity-100'
							strokeWidth={2}
						/>
					</span>
				)}
			</AccordionPrimitive.Trigger>
		</AccordionPrimitive.Header>
	);
};

const AccordionPanel = ({ className, children, ...props }: AccordionPrimitive.Panel.Props) => {
	return (
		<AccordionPrimitive.Panel
			data-slot='accordion-panel'
			className='h-(--accordion-panel-height) overflow-hidden text-sm text-muted-foreground transition-[height] duration-200 ease-in-out data-ending-style:h-0 data-starting-style:h-0'
			{...props}
		>
			<div className={cn("pt-0 pb-4", className)}>{children}</div>
		</AccordionPrimitive.Panel>
	);
};

export { Accordion, AccordionItem, AccordionTrigger, AccordionPanel, AccordionPanel as AccordionContent };
