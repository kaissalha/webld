import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = {
	GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
};

const restoreEnv = () => {
	if (originalEnv.GOOGLE_CLIENT_ID === undefined) {
		delete process.env.GOOGLE_CLIENT_ID;
	} else {
		process.env.GOOGLE_CLIENT_ID = originalEnv.GOOGLE_CLIENT_ID;
	}

	if (originalEnv.GOOGLE_CLIENT_SECRET === undefined) {
		delete process.env.GOOGLE_CLIENT_SECRET;
	} else {
		process.env.GOOGLE_CLIENT_SECRET = originalEnv.GOOGLE_CLIENT_SECRET;
	}
};

describe("gmail config", () => {
	afterEach(() => {
		restoreEnv();
	});

	it("throws when required env vars are missing", async () => {
		delete process.env.GOOGLE_CLIENT_ID;
		delete process.env.GOOGLE_CLIENT_SECRET;

		vi.resetModules();

		await expect(import("../../src/gmail/config.ts")).rejects.toThrow(
			"GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set"
		);
	});
});
