import type { ComponentProps } from "react";

import { cn } from "@starter/ui/lib/utils";

export const PricingHero = ({ className, ...props }: ComponentProps<"section">) => {
	return (
		<section
			className={cn(
				"mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-6 py-16 md:max-w-3xl lg:max-w-7xl lg:px-10",
				className
			)}
			{...props}
		>
			<h1 className='max-w-5xl text-center font-display text-7xl tracking-tight text-olive-950 text-pretty'>
				Simple Pricing.
			</h1>
			<div className='flex max-w-xl flex-col gap-4 text-center text-lg text-olive-700'>
				<p>
					Simplify your shared inbox, collaborate effortlessly, and give every customer a reply that feels
					personal, even if it was written by a bot.
				</p>
			</div>
		</section>
	);
};
