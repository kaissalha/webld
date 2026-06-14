import { flag } from "flags/next";

import { identify, preFetchedPostHogAdapter } from "./lib/server/posthog";

export const testFlag = flag({
	key: "test",
	description: "Enable agent chat bots",
	adapter: preFetchedPostHogAdapter.isFeatureEnabled(),
	defaultValue: false,
	identify,
});
