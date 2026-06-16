import { emailOTPClient, organizationClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { getBaseURL } from "@webld/utils";

export const authClient = createAuthClient({
	baseURL: getBaseURL().toString(),
	plugins: [emailOTPClient(), twoFactorClient(), organizationClient()],
});
