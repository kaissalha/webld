import type { ComponentProps } from "react";

import type { Route } from "next";
import Link from "next/link";

import { Check } from "lucide-react";

import { Button } from "@starter/ui/components/button";
import { cn } from "@starter/ui/lib/utils";

const FEATURES = [
	"Unlimited mailboxes",
	"Unlimited team members",
	"Inbox Agent",
	"Collision detection",
	"Snippets and templates",
	"Reporting dashboard",
	"Slack integration",
] as const;

export const PricingSection = ({ className, ...props }: ComponentProps<"section">) => {
	return (
		<section
			className={cn("mx-auto w-full max-w-2xl px-6 py-16 md:max-w-3xl lg:max-w-7xl lg:px-10", className)}
			{...props}
		>
			<div className='grid grid-cols-1 gap-x-2 rounded-xl bg-olive-950/2.5 p-2 lg:grid-cols-2'>
				<div className='flex flex-col items-start justify-between gap-10 p-6 sm:p-10'>
					<div className='flex flex-col gap-6'>
						<h2 className='font-display text-3xl tracking-tight text-olive-950 text-pretty sm:text-5xl'>
							No setup fees. No contracts. Cancel anytime.
						</h2>
						<div className='flex flex-col gap-4 text-base text-olive-700 text-pretty'>
							<p>
								Commitment free, because we are banking on the fact that you&apos;ll forget that
								you&apos;re even paying us.
							</p>
						</div>
					</div>
					<Button size='lg' asChild>
						<Link href={"#" as Route}>Start free trial</Link>
					</Button>
				</div>

				<div className='rounded-sm bg-olive-50 p-6 sm:p-10'>
					<div className='flex items-baseline gap-2'>
						<p className='text-7xl font-light tracking-tight text-olive-950 sm:text-8xl'>$49</p>
						<span className='text-lg text-olive-700'>/mo</span>
					</div>
					<ul className='mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-1'>
						{FEATURES.map((feature) => (
							<li key={feature} className='flex gap-3 text-sm'>
								<span className='flex size-5 shrink-0 items-center justify-center rounded-xs bg-olive-950'>
									<Check className='size-3 stroke-white' strokeWidth={2} />
								</span>
								<p className='text-olive-700'>{feature}</p>
							</li>
						))}
					</ul>
				</div>
			</div>
		</section>
	);
};
