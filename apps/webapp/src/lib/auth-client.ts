import { stripeClient } from "@better-auth/stripe/client";
import {
	emailOTPClient,
	inferOrgAdditionalFields,
	organizationClient,
	twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "@starter/server/auth";
import { getBaseURL } from "@starter/utils";

export const authClient = createAuthClient({
	baseURL: getBaseURL().toString(),
	plugins: [
		stripeClient({
			subscription: true,
		}),
		emailOTPClient(),
		twoFactorClient(),
		organizationClient({
			schema: inferOrgAdditionalFields<typeof auth>(),
		}),
	],
});
