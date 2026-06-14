import { getProviderData as getPostHogProviderData } from "@flags-sdk/posthog";
import { mergeProviderData } from "flags";
import { createFlagsDiscoveryEndpoint, getProviderData } from "flags/next";

import * as flags from "@/flags";

export const GET = createFlagsDiscoveryEndpoint(
	async () => {
		if (!process.env.POSTHOG_PERSONAL_API_KEY) {
			throw new Error("POSTHOG_PERSONAL_API_KEY is not set");
		}
		if (!process.env.POSTHOG_PROJECT_ID) {
			throw new Error("POSTHOG_PROJECT_ID is not set");
		}

		return mergeProviderData([
			getProviderData(flags),
			getPostHogProviderData({
				personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
				projectId: process.env.POSTHOG_PROJECT_ID,
			}),
		]);
	},
	{
		secret: process.env.FLAGS_SECRET,
	}
);
