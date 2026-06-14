"use client";

import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";

export type Subscription = {
	id: string;
	status: string;
	plan: string;
	periodEnd: Date | undefined;
	seats: number | undefined;
	priceId: string | undefined;
	referenceId: string;
};

export const useSubscription = () => {
	const { data: activeOrg } = authClient.useActiveOrganization();

	const {
		data: subscriptions = [],
		isPending: isLoading,
		refetch,
	} = useQuery({
		queryKey: ["subscriptions", activeOrg?.id],
		queryFn: async () => {
			if (!activeOrg?.id) return [];
			const { data } = await authClient.subscription.list({
				query: {
					referenceId: activeOrg.id,
					customerType: "organization",
				},
			});
			return (data ?? []).map((sub) => ({
				id: sub.id,
				status: sub.status,
				plan: sub.plan,
				periodEnd: sub.periodEnd,
				seats: sub.seats,
				priceId: sub.priceId,
				referenceId: sub.referenceId,
			})) as Subscription[];
		},
		enabled: !!activeOrg?.id,
	});

	const activeSubscription = useMemo(
		() => subscriptions.find((sub) => sub.status === "active" || sub.status === "trialing"),
		[subscriptions]
	);

	return {
		subscriptions,
		activeSubscription,
		isLoading,
		hasActiveSubscription: !!activeSubscription,
		refetch,
	};
};
