"use client";

import { Fieldset as FieldsetPrimitive } from "@base-ui/react/fieldset";

import { cn } from "@webld/ui/lib/utils";

const Fieldset = ({ className, ...props }: FieldsetPrimitive.Root.Props) => {
	return (
		<FieldsetPrimitive.Root
			data-slot='fieldset'
			className={cn("flex w-full max-w-64 flex-col gap-6", className)}
			{...props}
		/>
	);
};

const FieldsetLegend = ({ className, ...props }: FieldsetPrimitive.Legend.Props) => {
	return (
		<FieldsetPrimitive.Legend data-slot='fieldset-legend' className={cn("font-semibold", className)} {...props} />
	);
};

export { Fieldset, FieldsetLegend };
