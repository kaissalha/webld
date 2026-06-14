import { stripeClient } from "@better-auth/stripe/client";
import {
	emailOTPClient,
	inferOrgAdditionalFields,
	organizationClient,
	twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "@webld/server/auth";
import { getBaseURL } from "@webld/utils";

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
