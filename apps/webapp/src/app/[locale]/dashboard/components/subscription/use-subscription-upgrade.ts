"use client";

import { useCallback, useState } from "react";

import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { toast } from "@starter/ui/components/sonner";

import type { PlanId } from "./plans-config";

type UseSubscriptionUpgradeProps = {
	cancelUrl: string;
	successUrl: string;
};

export const useSubscriptionUpgrade = ({ cancelUrl, successUrl }: UseSubscriptionUpgradeProps) => {
	const tCommon = useTranslations("common");
	const { data: activeOrg } = authClient.useActiveOrganization();
	const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
	const [isUpgrading, setIsUpgrading] = useState(false);

	const handleSelectPlan = useCallback(
		async ({ planId }: { planId: PlanId }) => {
			if (!activeOrg?.id) {
				toast.error(tCommon("errors.somethingWentWrong"));
				return;
			}

			setSelectedPlan(planId);
			setIsUpgrading(true);

			try {
				await authClient.subscription.upgrade({
					plan: planId,
					referenceId: activeOrg.id,
					customerType: "organization",
					successUrl,
					cancelUrl,
				});
			} catch {
				toast.error(tCommon("errors.somethingWentWrong"));
				setSelectedPlan(null);
			} finally {
				setIsUpgrading(false);
			}
		},
		[activeOrg?.id, cancelUrl, successUrl, tCommon]
	);

	return {
		handleSelectPlan,
		isUpgrading,
		selectedPlan,
	};
};
