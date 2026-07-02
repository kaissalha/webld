import { emailOTPClient, organizationClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { url } from "@webld/utils";

export const authClient = createAuthClient({
	baseURL: url.getBaseURL().toString(),
	plugins: [emailOTPClient(), twoFactorClient(), organizationClient()],
});
