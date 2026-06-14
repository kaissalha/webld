"use client";

import type { ComponentProps } from "react";

import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "@webld/ui/components/accordion";
import { cn } from "@webld/ui/lib/utils";

const faqs = [
	{
		id: "faq-1",
		question: "Do I need a credit card to start the free trial?",
		answer: "Yes, but don't worry, you won't be charged until the trial period is over. We won't send you an email reminding you when this happens because we are really hoping you'll forget and we can keep charging you until your cards expires",
	},
	{
		id: "faq-2",
		question: "Can my whole team use the same inbox?",
		answer: "Yes, the more the merrier! Oatmeal works best when your entire company has access. We will charge you per additional seat, but we won't tell you about this until you get your invoice.",
	},
	{
		id: "faq-3",
		question: "Is the AI agent actually a bunch of people in India?",
		answer: "Not just India! We have people in lots of countries around the world pretending to be an AI, including some that are currently under sanctions, so we can't legally mention them here.",
	},
	{
		id: "faq-4",
		question: "Does Oatmeal replace my email client?",
		answer: "Absolutely. The idea is that we transition you away from email entirely, so you become completely dependent on our service. Like a parasite living off a host.",
	},
];

export const Faqs = ({ className, ...props }: ComponentProps<"section">) => {
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
				Questions & Answers
			</h2>
			<Accordion multiple={false}>
				{faqs.map((faq) => (
					<AccordionItem key={faq.id} value={faq.id} className='border-b border-olive-950/10'>
						<AccordionTrigger className='flex w-full items-center justify-between py-6 text-start text-base font-medium text-olive-950'>
							{faq.question}
						</AccordionTrigger>
						<AccordionPanel className='pb-6 text-sm text-olive-700'>{faq.answer}</AccordionPanel>
					</AccordionItem>
				))}
			</Accordion>
		</section>
	);
};
