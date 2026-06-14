"use client";

import { useTranslations } from "next-intl";

import { Button } from "@starter/ui/components/button";
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPopup,
	DialogTitle,
} from "@starter/ui/components/dialog";

import { SubscriptionPlanDialogBody } from "./subscription-plan-dialog-body";
import { useSubscriptionUpgrade } from "./use-subscription-upgrade";

type UpgradePlanDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export const UpgradePlanDialog = ({ open, onOpenChange }: UpgradePlanDialogProps) => {
	const t = useTranslations("subscription");
	const tCommon = useTranslations("common");
	const { handleSelectPlan, isUpgrading, selectedPlan } = useSubscriptionUpgrade({
		successUrl: "/dashboard/settings/subscription?subscription=success",
		cancelUrl: "/dashboard/settings/subscription?subscription=canceled",
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPopup className='sm:max-w-3xl'>
				<DialogHeader>
					<DialogTitle>{t("upgrade.title")}</DialogTitle>
					<DialogDescription>{t("upgrade.description")}</DialogDescription>
				</DialogHeader>
				<SubscriptionPlanDialogBody
					selectedPlan={selectedPlan}
					isUpgrading={isUpgrading}
					onSelectPlan={handleSelectPlan}
				/>

				<DialogFooter>
					<Button variant='outline' onClick={() => onOpenChange(false)}>
						{tCommon("cancel")}
					</Button>
				</DialogFooter>
			</DialogPopup>
		</Dialog>
	);
};
