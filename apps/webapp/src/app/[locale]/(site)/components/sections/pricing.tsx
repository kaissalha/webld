import type { ComponentProps } from "react";

import { Check } from "lucide-react";
import { getMessages, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Button } from "@webld/ui/components/button";
import { cn } from "@webld/ui/lib/utils";

const plans = [
	{ id: "webld", price: "$12", highlighted: false, badge: false },
	{ id: "growth", price: "$49", highlighted: true, badge: true },
	{ id: "pro", price: "$299", highlighted: false, badge: false },
] as const;

export const Pricing = async ({ className, ...props }: ComponentProps<"section">) => {
	const [t, messages] = await Promise.all([getTranslations("site.pricing"), getMessages()]);

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
				{t("title")}
			</h2>
			<div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
				{plans.map((plan) => (
					<div
						key={plan.id}
						className='flex flex-col justify-between gap-6 rounded-xl bg-olive-950/2.5 p-6 sm:items-start'
					>
						<div className='self-stretch'>
							<div className='flex items-center justify-between'>
								{plan.badge && (
									<div className='order-last inline-flex rounded-full bg-olive-950/10 px-2 text-xs font-medium text-olive-950'>
										{t("mostPopular")}
									</div>
								)}
								<h3 className='text-2xl tracking-tight text-olive-950'>{t(`plans.${plan.id}.name`)}</h3>
							</div>
							<p className='mt-1 inline-flex gap-1 text-base'>
								<span className='text-olive-950'>{plan.price}</span>
								<span className='text-olive-500'>{t("period")}</span>
							</p>
							<div className='mt-4 flex flex-col gap-4 text-sm text-olive-700'>
								<p>{t(`plans.${plan.id}.subheadline`)}</p>
							</div>
							<ul className='mt-4 space-y-2 text-sm text-olive-700'>
								{Object.values(messages.site.pricing.plans[plan.id].features).map((feature) => (
									<li key={feature} className='flex gap-4'>
										<Check className='h-lh shrink-0 size-3.5 stroke-olive-950' strokeWidth={1.5} />
										<p>{feature}</p>
									</li>
								))}
							</ul>
						</div>
						<Button variant={plan.highlighted ? "default" : "outline"} size='lg' asChild>
							<Link href='#'>{t("startTrial")}</Link>
						</Button>
					</div>
				))}
			</div>
		</section>
	);
};
