"use client";

import { useState } from "react";

import type { DateRange } from "@daypicker/react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@webld/ui/components/button";
import { Calendar } from "@webld/ui/components/calendar";
import { Popover, PopoverPopup, PopoverTrigger } from "@webld/ui/components/popover";
import { cn } from "@webld/ui/lib/utils";

type DatePickerProps = {
	value?: Date;
	onChange?: (date: Date | undefined) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	formatStr?: string;
};

const DatePicker = ({
	value,
	onChange,
	placeholder = "Pick a date",
	className,
	disabled,
	formatStr = "PPP",
}: DatePickerProps) => {
	const [internalDate, setInternalDate] = useState<Date | undefined>();
	const date = value ?? internalDate;

	const handleSelect = (selected: Date | undefined) => {
		if (!value) setInternalDate(selected);
		onChange?.(selected);
	};

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						variant='outline'
						disabled={disabled}
						className={cn(
							"w-70 justify-start text-start font-normal",
							!date && "text-muted-foreground",
							className
						)}
					/>
				}
			>
				<CalendarIcon />
				{date ? format(date, formatStr) : <span>{placeholder}</span>}
			</PopoverTrigger>
			<PopoverPopup align='start' className='w-auto p-0'>
				<Calendar mode='single' selected={date} onSelect={handleSelect} />
			</PopoverPopup>
		</Popover>
	);
};

type DateRangePickerProps = {
	value?: DateRange;
	onChange?: (range: DateRange | undefined) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	formatStr?: string;
};

const DateRangePicker = ({
	value,
	onChange,
	placeholder = "Pick a date range",
	className,
	disabled,
	formatStr = "LLL dd, y",
}: DateRangePickerProps) => {
	const [internalRange, setInternalRange] = useState<DateRange | undefined>();
	const range = value ?? internalRange;

	const handleSelect = (selected: DateRange | undefined) => {
		if (!value) setInternalRange(selected);
		onChange?.(selected);
	};

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						variant='outline'
						disabled={disabled}
						className={cn(
							"w-75 justify-start text-start font-normal",
							!range && "text-muted-foreground",
							className
						)}
					/>
				}
			>
				<CalendarIcon />
				{range?.from ? (
					range.to ? (
						<>
							{format(range.from, formatStr)} &ndash; {format(range.to, formatStr)}
						</>
					) : (
						format(range.from, formatStr)
					)
				) : (
					<span>{placeholder}</span>
				)}
			</PopoverTrigger>
			<PopoverPopup align='start' className='w-auto p-0'>
				<Calendar mode='range' selected={range} onSelect={handleSelect} numberOfMonths={2} />
			</PopoverPopup>
		</Popover>
	);
};

export { DatePicker, DateRangePicker };
export type { DatePickerProps, DateRangePickerProps };
