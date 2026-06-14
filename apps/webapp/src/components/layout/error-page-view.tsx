"use client";

import { ComputerIcon, RotateCcwIcon } from "lucide-react";

import { Button } from "@webld/ui/components/button";

export type ErrorPageViewProps = {
	description: string;
	onReload: () => void;
	reloadLabel: string;
	title: string;
};

export const ErrorPageView = ({ description, onReload, reloadLabel, title }: ErrorPageViewProps) => {
	return (
		<div className='flex min-h-screen flex-col items-center justify-center p-8'>
			<div className='flex w-full max-w-100 flex-col items-center gap-4'>
				<div className='flex w-full flex-col items-center gap-4'>
					<div className='flex w-full flex-col items-center gap-2'>
						<div className='flex h-16 w-16 items-center justify-center'>
							<ComputerIcon className='h-16 w-16 text-foreground' />
						</div>

						<h1 className='text-center font-semibold text-foreground'>{title}</h1>

						<p className='text-center font-medium leading-snug text-muted-foreground'>{description}</p>
					</div>

					<Button onClick={onReload}>
						<RotateCcwIcon className='h-5 w-5' />
						<span className='px-1'>{reloadLabel}</span>
					</Button>
				</div>
			</div>
		</div>
	);
};
