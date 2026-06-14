"use client";

import { BellIcon, CheckIcon, InfoIcon, LoaderIcon, TriangleAlertIcon } from "lucide-react";
import { Toaster as Sonner, toast } from "sonner";

import { buttonVariants } from "./button";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
	return (
		<Sonner
			icons={{
				success: <CheckIcon className='size-5 text-success-foreground' />,
				info: <InfoIcon className='size-5 text-muted-foreground' />,
				warning: <BellIcon className='size-5 text-warning-foreground' />,
				error: <TriangleAlertIcon className='size-5 text-destructive' />,
				loading: <LoaderIcon className='size-5 animate-spin' />,
			}}
			className='toaster'
			toastOptions={{
				unstyled: true,
				classNames: {
					toast:
						"toast flex items-center w-full gap-3 text-sm font-medium bg-popover text-muted-foreground border border-border shadow-md rounded-2xl p-4 " +
						"data-[type=success]:border-success/20 data-[type=success]:bg-success/10 data-[type=success]:text-success-foreground data-[type=warning]:border-warning/20 data-[type=warning]:bg-warning/10 data-[type=warning]:text-warning-foreground data-[type=error]:border-destructive/20 data-[type=error]:bg-destructive/10 data-[type=error]:text-destructive",
					icon: "m-0! size-5!",
					loader: "",
					description: "",
					actionButton: buttonVariants({ variant: "secondary" }),
				},
			}}
			{...props}
		/>
	);
};

export { Toaster, toast };
