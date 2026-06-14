"use client";

import type { ReactNode } from "react";

import type { LucideIcon } from "lucide-react";
import type { AppConfig } from "next-intl";
import { useTranslations } from "next-intl";

import { SidebarTrigger } from "@webld/ui/components/sidebar";
import { cn } from "@webld/ui/lib/utils";

export type BreadcrumbItemProp =
	| {
			icon?: LucideIcon;
			labelTx: keyof AppConfig["Messages"]["breadcrumbs"];
			href?: string;
	  }
	| {
			icon?: LucideIcon;
			label: string;
			href?: string;
	  };

export type HeaderProps = {
	item: BreadcrumbItemProp;
	actions?: ReactNode;
	className?: string;
	/** Inline content after the title (same row; scrolls horizontally if needed). */
	afterLabel?: ReactNode;
};

export const Header = ({ item, actions, className, afterLabel }: HeaderProps) => {
	const t = useTranslations("breadcrumbs");
	const label = "labelTx" in item ? t(item.labelTx) : item.label;

	return (
		<header
			className={cn(
				"sticky top-0 z-50 flex shrink-0 justify-between bg-background px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-2 md:px-5 md:py-3.5",
				className
			)}
		>
			<div className='flex min-w-0 flex-1 items-center gap-3 md:gap-4'>
				<SidebarTrigger className='-ms-1 shrink-0 md:hidden' purpose='navigation' />
				<div className='flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain md:gap-3 no-scrollbar'>
					<span className='shrink-0 whitespace-nowrap text-lg leading-none'>{label}</span>
					{afterLabel ? (
						<>
							<span className='hidden h-4 w-px shrink-0 bg-border sm:block' aria-hidden />
							{afterLabel}
						</>
					) : null}
				</div>
			</div>
			{actions && (
				<div className='flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 md:justify-end'>
					{actions}
				</div>
			)}
		</header>
	);
};
