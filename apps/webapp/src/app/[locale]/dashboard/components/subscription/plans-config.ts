export type PlanId = "starter" | "pro";

export type Plan = {
	id: PlanId;
	name: string;
	price: number;
	features: readonly FeatureKey[];
	highlighted?: boolean;
	badge?: "popular";
};

export type FeatureKey =
	| "upTo5Users"
	| "basicAnalytics"
	| "emailSupport"
	| "5gbStorage"
	| "unlimitedUsers"
	| "advancedAnalytics"
	| "prioritySupport"
	| "unlimitedStorage"
	| "apiAccess"
	| "customIntegrations";

const STARTER_FEATURES = ["upTo5Users", "basicAnalytics", "emailSupport", "5gbStorage"] as const;
const PRO_FEATURES = [
	"unlimitedUsers",
	"advancedAnalytics",
	"prioritySupport",
	"unlimitedStorage",
	"apiAccess",
	"customIntegrations",
] as const;

export const PLANS: Plan[] = [
	{
		id: "starter",
		name: "Starter",
		price: 12,
		features: STARTER_FEATURES,
	},
	{
		id: "pro",
		name: "Pro",
		price: 49,
		features: PRO_FEATURES,
		highlighted: true,
		badge: "popular",
	},
];
