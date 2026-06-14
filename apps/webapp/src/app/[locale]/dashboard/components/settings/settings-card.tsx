"use client";

import type { ReactNode } from "react";

import { cn } from "@starter/ui/lib/utils";

type SettingsCardProps = {
	title: string;
	description: string;
	children?: ReactNode;
	footer?: ReactNode;
	footerHint?: string;
	action?: ReactNode;
	className?: string;
};

export const SettingsCard = ({
	title,
	description,
	children,
	footer,
	footerHint,
	action,
	className,
}: SettingsCardProps) => {
	const hasFooter = footer || footerHint;

	return (
		<div className={cn("rounded-lg border border-border bg-card", className)}>
			<div className='flex items-start justify-between gap-4 p-6'>
				<div className='flex flex-col gap-1'>
					<h3 className='font-semibold'>{title}</h3>
					<p className='text-sm text-muted-foreground'>{description}</p>
				</div>
				{action && <div className='shrink-0'>{action}</div>}
			</div>

			{children && <div className='px-6 pb-6'>{children}</div>}

			{hasFooter && (
				<div className='flex items-center justify-between gap-4 border-t border-border bg-muted/30 px-6 py-4'>
					{footerHint && <p className='text-xs text-muted-foreground'>{footerHint}</p>}
					{!footerHint && <div />}
					{footer}
				</div>
			)}
		</div>
	);
};

type SettingsInlineCardProps = {
	title: string;
	description: string;
	children: ReactNode;
	className?: string;
};

export const SettingsInlineCard = ({ title, description, children, className }: SettingsInlineCardProps) => {
	return (
		<div
			className={cn(
				"flex items-center justify-between gap-6 rounded-lg border border-border bg-card p-6",
				className
			)}
		>
			<div className='flex flex-col gap-1'>
				<h3 className='font-semibold'>{title}</h3>
				<p className='text-sm text-muted-foreground'>{description}</p>
			</div>
			<div className='shrink-0'>{children}</div>
		</div>
	);
};
