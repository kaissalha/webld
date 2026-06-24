"use client";

import type { ComponentProps } from "react";

import { useTranslations } from "next-intl";

import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "@webld/ui/components/accordion";
import { cn } from "@webld/ui/lib/utils";

const faqIds = ["trial", "team", "ai", "email"] as const;

export const Faqs = ({ className, ...props }: ComponentProps<"section">) => {
	const t = useTranslations("site.faqs");

	return (
		<section
			id='faqs'
			className={cn(
				"py-16 mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16",
				className
			)}
			{...props}
		>
			<h2 className='font-display text-3xl tracking-tight text-pretty text-olive-950 sm:text-5xl'>
				{t("title")}
			</h2>
			<Accordion multiple={false}>
				{faqIds.map((id) => (
					<AccordionItem key={id} value={id} className='border-b border-olive-950/10'>
						<AccordionTrigger className='flex w-full items-center justify-between py-6 text-start text-base font-medium text-olive-950'>
							{t(`items.${id}.question`)}
						</AccordionTrigger>
						<AccordionPanel className='pb-6 text-sm text-olive-700'>
							{t(`items.${id}.answer`)}
						</AccordionPanel>
					</AccordionItem>
				))}
			</Accordion>
		</section>
	);
};
