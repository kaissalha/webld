"use client";

import type { ReactNode } from "react";

import { CheckIcon, ZapIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@starter/ui/components/badge";
import { Button } from "@starter/ui/components/button";
import { cn } from "@starter/ui/lib/utils";

import { type FeatureKey, PLANS, type PlanId } from "./plans-config";

type SubscriptionPlanDialogBodyProps = {
	footer?: ReactNode;
	isUpgrading: boolean;
	onSelectPlan: ({ planId }: { planId: PlanId }) => void;
	selectedPlan: PlanId | null;
};

export const SubscriptionPlanDialogBody = ({
	footer,
	isUpgrading,
	onSelectPlan,
	selectedPlan,
}: SubscriptionPlanDialogBodyProps) => {
	const t = useTranslations("subscription");

	const featureLabels: Record<FeatureKey, string> = {
		upTo5Users: t("dialog.features.upTo5Users"),
		basicAnalytics: t("dialog.features.basicAnalytics"),
		emailSupport: t("dialog.features.emailSupport"),
		"5gbStorage": t("dialog.features.5gbStorage"),
		unlimitedUsers: t("dialog.features.unlimitedUsers"),
		advancedAnalytics: t("dialog.features.advancedAnalytics"),
		prioritySupport: t("dialog.features.prioritySupport"),
		unlimitedStorage: t("dialog.features.unlimitedStorage"),
		apiAccess: t("dialog.features.apiAccess"),
		customIntegrations: t("dialog.features.customIntegrations"),
	};
	const planDescriptions: Record<PlanId, string> = {
		starter: t("dialog.plans.starter.description"),
		pro: t("dialog.plans.pro.description"),
	};

	return (
		<div className='flex flex-col gap-6'>
			<div className='grid gap-4 sm:grid-cols-2'>
				{PLANS.map((plan) => (
					<div
						key={plan.id}
						className={cn(
							"relative flex flex-col gap-4 rounded-xl border p-5 transition-colors",
							plan.highlighted
								? "border-primary bg-primary/5 ring-1 ring-primary"
								: "border-border bg-card hover:border-primary/50"
						)}
					>
						{plan.badge && (
							<Badge variant='default' className='absolute -top-2.5 end-4'>
								{t("dialog.badges.popular")}
							</Badge>
						)}

						<div className='flex flex-col gap-1'>
							<h3 className='font-semibold'>{plan.name}</h3>
							<p className='text-sm text-muted-foreground'>{planDescriptions[plan.id]}</p>
						</div>

						<div className='flex items-baseline gap-1'>
							<span className='text-3xl font-bold'>${plan.price}</span>
							<span className='text-muted-foreground'>/{t("dialog.perMonth")}</span>
						</div>

						<ul className='flex flex-col gap-2'>
							{plan.features.map((feature) => (
								<li key={feature} className='flex items-start gap-2 text-sm'>
									<CheckIcon className='mt-0.5 size-4 shrink-0 text-primary' />
									<span>{featureLabels[feature]}</span>
								</li>
							))}
						</ul>

						<Button
							className='mt-auto'
							variant={plan.highlighted ? "default" : "outline"}
							onClick={() => onSelectPlan({ planId: plan.id })}
							loading={isUpgrading && selectedPlan === plan.id}
							disabled={isUpgrading}
						>
							{plan.highlighted ? (
								<>
									<ZapIcon className='size-4' />
									{t("dialog.getStarted")}
								</>
							) : (
								t("dialog.selectPlan")
							)}
						</Button>
					</div>
				))}
			</div>

			{footer}
		</div>
	);
};
