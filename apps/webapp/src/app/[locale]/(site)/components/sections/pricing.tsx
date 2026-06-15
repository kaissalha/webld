import type { ComponentProps } from "react";

import type { Route } from "next";
import Link from "next/link";

import { Check } from "lucide-react";

import { Button } from "@webld/ui/components/button";
import { cn } from "@webld/ui/lib/utils";

const plans = [
	{
		name: "webld",
		price: "$12",
		period: "/mo",
		subheadline: "Small teams getting started with shared inboxes",
		features: [
			"Shared inbox for up to 2 mailboxes",
			"Tagging & assignment",
			"Customer context",
			"Automatic replies",
			"Email support",
		],
		highlighted: false,
	},
	{
		name: "Growth",
		price: "$49",
		period: "/mo",
		subheadline: "Growing teams needing collaboration and insights",
		badge: "Most popular",
		features: [
			"Everything in webld",
			"Inbox Agent",
			"Unlimited mailboxes",
			"Collision detection",
			"Snippets and templates",
			"Reporting dashboard",
			"Slack integration",
		],
		highlighted: true,
	},
	{
		name: "Pro",
		price: "$299",
		period: "/mo",
		subheadline: "Support-focused teams and larger workspaces",
		features: [
			"Everything in Growth",
			"Custom roles & permissions",
			"Automation engine",
			"API access",
			"SLA tracking",
			"SSO support",
			"SOC 2 compliance",
		],
		highlighted: false,
	},
];

export const Pricing = ({ className, ...props }: ComponentProps<"section">) => {
	return (
		<section
			id='pricing'
			className={cn(
				"py-16 mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10 flex flex-col gap-16",
				className
			)}
			{...props}
		>
			<h2 className='font-display text-3xl tracking-tight text-pretty text-olive-950 sm:text-5xl text-start'>
				Pricing to fit your business needs.
			</h2>
			<div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
				{plans.map((plan) => (
					<div
						key={plan.name}
						className='flex flex-col justify-between gap-6 rounded-xl bg-olive-950/2.5 p-6 sm:items-start'
					>
						<div className='self-stretch'>
							<div className='flex items-center justify-between'>
								{plan.badge && (
									<div className='order-last inline-flex rounded-full bg-olive-950/10 px-2 text-xs font-medium text-olive-950'>
										{plan.badge}
									</div>
								)}
								<h3 className='text-2xl tracking-tight text-olive-950'>{plan.name}</h3>
							</div>
							<p className='mt-1 inline-flex gap-1 text-base'>
								<span className='text-olive-950'>{plan.price}</span>
								{plan.period && <span className='text-olive-500'>{plan.period}</span>}
							</p>
							<div className='mt-4 flex flex-col gap-4 text-sm text-olive-700'>
								<p>{plan.subheadline}</p>
							</div>
							<ul className='mt-4 space-y-2 text-sm text-olive-700'>
								{plan.features.map((feature) => (
									<li key={feature} className='flex gap-4'>
										<Check className='h-lh shrink-0 size-3.5 stroke-olive-950' strokeWidth={1.5} />
										<p>{feature}</p>
									</li>
								))}
							</ul>
						</div>
						<Button variant={plan.highlighted ? "default" : "outline"} size='lg' asChild>
							<Link href={"#" as Route}>Start free trial</Link>
						</Button>
					</div>
				))}
			</div>
		</section>
	);
};
