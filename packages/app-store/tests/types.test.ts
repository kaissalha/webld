import { describe, expect, it } from "vitest";

import { isOAuthTokenRevokedError, OAuthTokenRevokedError } from "../src/types";

describe("OAuthTokenRevokedError", () => {
	it("marks OAuth token revoke errors", () => {
		const error = new OAuthTokenRevokedError("revoked", "gmail");

		expect(error.code).toBe("TOKEN_REVOKED");
		expect(error.provider).toBe("gmail");
		expect(isOAuthTokenRevokedError(error)).toBe(true);
		expect(isOAuthTokenRevokedError(new Error("other"))).toBe(false);
	});
});
