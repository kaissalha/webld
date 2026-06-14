"use client";

import { useTranslations } from "next-intl";

import { Dialog, DialogDescription, DialogPopup, DialogTitle } from "@starter/ui/components/dialog";

import { SubscriptionPlanDialogBody } from "./subscription-plan-dialog-body";
import { useSubscription } from "./use-subscription";
import { useSubscriptionUpgrade } from "./use-subscription-upgrade";

export const PlanSelectionDialog = () => {
	const t = useTranslations("subscription");
	const { hasActiveSubscription, isLoading: isLoadingSubscription } = useSubscription();
	const { handleSelectPlan, isUpgrading, selectedPlan } = useSubscriptionUpgrade({
		successUrl: "/dashboard?subscription=success",
		cancelUrl: "/dashboard?subscription=canceled",
	});

	// Don't show dialog while loading or if user has active subscription
	if (isLoadingSubscription || hasActiveSubscription) {
		return null;
	}

	return (
		<Dialog open modal>
			<DialogPopup className='sm:max-w-3xl' showCloseButton={false}>
				<div className='flex flex-col gap-6'>
					{/* Header */}
					<div className='flex flex-col items-center gap-2 text-center'>
						<DialogTitle className='text-2xl'>{t("dialog.title")}</DialogTitle>
						<DialogDescription className='max-w-md'>{t("dialog.description")}</DialogDescription>
					</div>
					<SubscriptionPlanDialogBody
						selectedPlan={selectedPlan}
						isUpgrading={isUpgrading}
						onSelectPlan={handleSelectPlan}
						footer={<p className='text-center text-xs text-muted-foreground'>{t("dialog.footer")}</p>}
					/>
				</div>
			</DialogPopup>
		</Dialog>
	);
};
