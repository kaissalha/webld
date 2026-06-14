/**
 * @vitest-environment node
 */
import { NextRequest } from "next/server";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { loggerError, runOAuthTokenRefreshJob } = vi.hoisted(() => ({
	loggerError: vi.fn(),
	runOAuthTokenRefreshJob: vi.fn(),
}));

vi.mock("@starter/logger/server", () => ({
	logger: {
		error: loggerError,
	},
}));

vi.mock("@starter/server/oauth-token-refresh", () => ({
	runOAuthTokenRefreshJob,
}));

import { GET } from "@/app/api/cron/refresh-oauth-tokens/route";

const createRequest = (headers?: HeadersInit) => {
	return new NextRequest("http://localhost:3000/api/cron/refresh-oauth-tokens", { headers });
};

describe("refresh-oauth-tokens cron route", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		delete process.env.CRON_SECRET;
	});

	it("returns 401 and does not load the job when CRON_SECRET is missing", async () => {
		const response = await GET(createRequest());
		const json = await response.json();

		expect(response.status).toBe(401);
		expect(json).toEqual({
			error: {
				message: "CRON_SECRET is not configured",
			},
		});
		expect(runOAuthTokenRefreshJob).not.toHaveBeenCalled();
		expect(loggerError).toHaveBeenCalledWith({
			message: "CRON_SECRET is not configured for refresh-oauth-tokens cron",
			metadata: {
				path: "/api/cron/refresh-oauth-tokens",
			},
		});
	});

	it("returns 401 and does not run the job when the auth header is wrong", async () => {
		process.env.CRON_SECRET = "expected-secret";

		const response = await GET(createRequest({ authorization: "Bearer wrong-secret" }));
		const json = await response.json();

		expect(response.status).toBe(401);
		expect(json).toEqual({
			error: {
				message: "Unauthorized",
			},
		});
		expect(runOAuthTokenRefreshJob).not.toHaveBeenCalled();
	});

	it("runs the job when the auth header matches CRON_SECRET", async () => {
		process.env.CRON_SECRET = "expected-secret";

		const response = await GET(createRequest({ authorization: "Bearer expected-secret" }));

		expect(response.status).toBe(200);
		expect(runOAuthTokenRefreshJob).toHaveBeenCalledTimes(1);
	});
});
