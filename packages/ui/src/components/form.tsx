"use client";

import { Form as FormPrimitive } from "@base-ui/react/form";

import { cn } from "@starter/ui/lib/utils";

const Form = ({ className, ...props }: FormPrimitive.Props) => {
	return <FormPrimitive data-slot='form' className={cn("flex w-full flex-col gap-4", className)} {...props} />;
};

export { Form };
