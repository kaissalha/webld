"use client";

import { useCallback, useState } from "react";

import { BadgeCheckIcon, CreditCardIcon, SparklesIcon, ZapIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { Button } from "@starter/ui/components/button";
import { Skeleton } from "@starter/ui/components/skeleton";
import { toast } from "@starter/ui/components/sonner";

import { UpgradePlanDialog } from "../subscription/upgrade-plan-dialog";
import { useSubscription } from "../subscription/use-subscription";
import { SettingsCard } from "./settings-card";

const FEATURES = ["feature1", "feature2", "feature3", "feature4"] as const;

export const SubscriptionTab = () => {
	const t = useTranslations("settings");
	const tCommon = useTranslations("common");
	const { data: session } = authClient.useSession();
	const { data: activeOrg } = authClient.useActiveOrganization();
	const { activeSubscription, isLoading: isLoadingSubscriptions } = useSubscription();
	const activeOrgId = activeOrg?.id;

	const [isLoadingPortal, setIsLoadingPortal] = useState(false);
	const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

	const handleManageBilling = useCallback(async () => {
		if (!activeOrgId) {
			return;
		}

		setIsLoadingPortal(true);

		const result = await authClient.subscription
			.billingPortal({
				customerType: "organization",
				referenceId: activeOrgId,
				returnUrl: window.location.href,
			})
			.catch(() => null);

		setIsLoadingPortal(false);

		if (!result || result.error) {
			toast.error(tCommon("errors.somethingWentWrong"));
			return;
		}

		if (result.data?.url) {
			window.location.href = result.data.url;
		}
	}, [activeOrgId, tCommon]);

	const handleUpgrade = useCallback(() => {
		setShowUpgradeDialog(true);
	}, []);

	if (!session) {
		return (
			<div className='flex max-w-3xl flex-col gap-6'>
				<div className='rounded-lg border border-border bg-card'>
					<div className='flex flex-col gap-2 p-6'>
						<Skeleton className='h-5 w-28' />
						<Skeleton className='h-4 w-64' />
					</div>
					<div className='px-6 pb-6'>
						<div className='flex items-center gap-4'>
							<Skeleton className='h-12 w-12 rounded-xl' />
							<div className='flex flex-col gap-2'>
								<Skeleton className='h-5 w-24' />
							</div>
						</div>
					</div>
					<div className='flex items-center justify-between gap-4 border-t border-border bg-muted/30 px-6 py-4'>
						<Skeleton className='h-3 w-44' />
						<Skeleton className='h-8 w-28' />
					</div>
				</div>

				<div className='rounded-lg border border-border bg-card'>
					<div className='flex flex-col gap-2 p-6'>
						<Skeleton className='h-5 w-24' />
						<Skeleton className='h-4 w-48' />
					</div>
					<div className='px-6 pb-6'>
						<div className='grid gap-3 sm:grid-cols-2'>
							{Array.from({ length: 4 }).map((_, i) => (
								<div key={i} className='flex items-center gap-2'>
									<Skeleton className='h-4 w-4' />
									<Skeleton className='h-4 w-32' />
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='flex max-w-3xl flex-col gap-6'>
			<SettingsCard
				title={t("subscription.currentPlan")}
				description={t("subscription.description")}
				footer={
					activeSubscription ? (
						<Button variant='outline' size='sm' onClick={handleManageBilling} loading={isLoadingPortal}>
							<CreditCardIcon className='h-4 w-4' />
							{t("subscription.manageBilling")}
						</Button>
					) : (
						<Button size='sm' onClick={handleUpgrade}>
							<SparklesIcon className='h-4 w-4' />
							{tCommon("upgrade")}
						</Button>
					)
				}
				footerHint={
					activeSubscription
						? t("subscription.renewsOn", {
								date: activeSubscription.periodEnd
									? new Date(activeSubscription.periodEnd).toLocaleDateString()
									: new Date().toLocaleDateString(),
							})
						: t("subscription.freePlanDescription")
				}
			>
				{isLoadingSubscriptions ? (
					<div className='flex items-center gap-4'>
						<Skeleton className='h-12 w-12 rounded-xl' />
						<div className='flex flex-col gap-2'>
							<Skeleton className='h-5 w-24' />
						</div>
					</div>
				) : activeSubscription ? (
					<div className='flex items-center gap-4'>
						<div className='flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10'>
							<BadgeCheckIcon className='h-6 w-6 text-primary' />
						</div>
						<div className='flex flex-col gap-1'>
							<div className='flex items-center gap-2'>
								<h3 className='font-semibold capitalize'>{activeSubscription.plan}</h3>
								<span className='rounded-full bg-success/20 px-2 py-0.5 text-xs font-medium text-success-foreground'>
									{t("subscription.status.active")}
								</span>
							</div>
						</div>
					</div>
				) : (
					<div className='flex items-center gap-4'>
						<div className='flex h-12 w-12 items-center justify-center rounded-xl bg-muted'>
							<ZapIcon className='h-6 w-6 text-muted-foreground' />
						</div>
						<div className='flex flex-col gap-1'>
							<h3 className='font-semibold'>{t("subscription.freePlan")}</h3>
						</div>
					</div>
				)}
			</SettingsCard>

			<SettingsCard title={t("subscription.features.title")} description={t("subscription.features.description")}>
				<ul className='grid gap-3 sm:grid-cols-2'>
					{FEATURES.map((feature) => (
						<li key={feature} className='flex items-center gap-2 text-sm'>
							<BadgeCheckIcon className='size-4 text-primary' />
							{t(`subscription.features.${feature}`)}
						</li>
					))}
				</ul>
			</SettingsCard>

			<UpgradePlanDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />
		</div>
	);
};
