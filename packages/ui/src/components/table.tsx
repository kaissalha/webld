"use client";

import type * as React from "react";

import { cn } from "@webld/ui/lib/utils";

const Table = ({ className, ...props }: React.ComponentProps<"table">) => {
	return (
		<div data-slot='table-container' className='max-w-screen no-scrollbar relative w-full shrink-0 overflow-x-auto'>
			<table
				data-slot='table'
				className={cn("w-full table-fixed caption-bottom text-sm", className)}
				{...props}
			/>
		</div>
	);
};

const TableHeader = ({ className, ...props }: React.ComponentProps<"thead">) => {
	return <thead data-slot='table-header' className={cn("[&_tr]:border-b", className)} {...props} />;
};

const TableBody = ({ className, ...props }: React.ComponentProps<"tbody">) => {
	return <tbody data-slot='table-body' className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
};

const TableFooter = ({ className, ...props }: React.ComponentProps<"tfoot">) => {
	return (
		<tfoot
			data-slot='table-footer'
			className={cn("border-t bg-muted/50 font-medium last:[&>tr]:border-b-0", className)}
			{...props}
		/>
	);
};

const TableRow = ({ className, ...props }: React.ComponentProps<"tr">) => {
	return (
		<tr
			data-slot='table-row'
			className={cn(
				"min-h-10 border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
				className
			)}
			{...props}
		/>
	);
};

const TableHead = ({ className, ...props }: React.ComponentProps<"th">) => {
	return (
		<th
			data-slot='table-head'
			className={cn("p-3 text-start align-middle font-medium text-muted-foreground first:ps-4", className)}
			{...props}
		/>
	);
};

const TableCell = ({ className, ...props }: React.ComponentProps<"td">) => {
	return (
		<td
			data-slot='table-cell'
			className={cn("h-10 p-3 align-middle text-foreground first:ps-4", className)}
			{...props}
		/>
	);
};

const TableCaption = ({ className, ...props }: React.ComponentProps<"caption">) => {
	return (
		<caption data-slot='table-caption' className={cn("text-muted-foreground mt-4 text-sm", className)} {...props} />
	);
};

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
