import type { ComponentProps } from "react";

import type { Route } from "next";
import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { Button } from "@starter/ui/components/button";
import { cn } from "@starter/ui/lib/utils";

export const PricingCta = ({ className, ...props }: ComponentProps<"section">) => {
	return (
		<section
			className={cn(
				"mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-16 md:max-w-3xl lg:max-w-7xl lg:px-10",
				className
			)}
			{...props}
		>
			<div className='flex flex-col gap-6'>
				<h2 className='max-w-4xl font-display text-3xl tracking-tight text-olive-950 text-pretty sm:text-5xl'>
					Have anymore questions?
				</h2>
				<div className='flex max-w-3xl flex-col gap-4 text-base text-olive-700 text-pretty'>
					<p>
						Chat to someone on our sales team, who will make promises about our roadmap that we won&apos;t
						keep.
					</p>
				</div>
			</div>
			<div className='flex items-center gap-4'>
				<Button size='lg' asChild>
					<Link href={"#" as Route}>Chat with us</Link>
				</Button>
				<Button variant='ghost' size='lg' asChild>
					<Link href={"#" as Route}>
						Book a demo <ArrowRight className='size-4' strokeWidth={1.5} />
					</Link>
				</Button>
			</div>
		</section>
	);
};
