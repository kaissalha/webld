export type PlanId = "webld" | "pro";

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

const webld_FEATURES = ["upTo5Users", "basicAnalytics", "emailSupport", "5gbStorage"] as const;
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
		id: "webld",
		name: "webld",
		price: 12,
		features: webld_FEATURES,
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
