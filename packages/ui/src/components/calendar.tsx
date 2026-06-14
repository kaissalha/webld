"use client";

import type * as React from "react";

import { DayPicker } from "@daypicker/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@starter/ui/components/button";
import { cn } from "@starter/ui/lib/utils";

const IconLeft = ({ className }: React.ComponentPropsWithoutRef<"button">) => (
	<ChevronLeft className={cn("size-4", className)} />
);

const IconRight = ({ className }: React.ComponentPropsWithoutRef<"button">) => (
	<ChevronRight className={cn("size-4", className)} />
);

const Calendar = ({
	className,
	classNames,
	showOutsideDays = true,
	...props
}: React.ComponentProps<typeof DayPicker>) => {
	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn("p-3", className)}
			classNames={{
				months: "flex flex-col sm:flex-row gap-2",
				month: "flex flex-col gap-4",
				month_caption: "flex justify-center pt-1 relative items-center w-full",
				caption_label: "text-sm font-medium",
				nav: "flex items-center gap-1",
				button_previous: cn(
					buttonVariants({ variant: "ghost" }),
					"size-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute start-1"
				),
				button_next: cn(
					buttonVariants({ variant: "ghost" }),
					"size-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute end-1"
				),
				month_grid: "w-full border-collapse space-x-1",
				weekdays: "flex",
				weekday: "text-muted-foreground rounded-md w-8 font-normal text-xs",
				week: "flex w-full mt-2",
				day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
				day_button: cn(buttonVariants({ variant: "ghost" }), "size-8 p-0 font-normal"),
				range_start:
					"day-range-start rounded-s-md aria-selected:bg-primary aria-selected:text-primary-foreground",
				range_end: "day-range-end rounded-e-md aria-selected:bg-primary aria-selected:text-primary-foreground",
				selected:
					"rounded-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
				today: "bg-accent text-accent-foreground",
				outside: "day-outside text-muted-foreground aria-selected:text-muted-foreground",
				disabled: "text-muted-foreground opacity-50",
				range_middle: "rounded-none aria-selected:bg-accent aria-selected:text-accent-foreground",
				hidden: "invisible",
				...classNames,
			}}
			components={{
				PreviousMonthButton: IconLeft,
				NextMonthButton: IconRight,
			}}
			{...props}
		/>
	);
};

export { Calendar };
