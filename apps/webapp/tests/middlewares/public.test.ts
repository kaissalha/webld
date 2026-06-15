/**
 * @vitest-environment node
 */
import { NextRequest } from "next/server";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession } = vi.hoisted(() => ({
	getSession: vi.fn(),
}));

vi.mock("@webld/server/auth", () => ({
	auth: {
		api: {
			getSession,
		},
	},
}));

import { publicMiddleware } from "@/middlewares/public";

const createRequest = (url: string) => new NextRequest(url);

const createSession = ({ activeOrganizationId }: { activeOrganizationId?: string | null }) => ({
	session: {
		activeOrganizationId,
	},
});

describe("publicMiddleware", () => {
	beforeEach(() => {
		getSession.mockReset();
	});

	it("redirects signed-in users with an active organization to the dashboard", async () => {
		getSession.mockResolvedValue(createSession({ activeOrganizationId: "org_123" }));

		const response = await publicMiddleware(createRequest("https://example.com/en/login"));

		expect(response?.headers.get("location")).toBe("https://example.com/en/dashboard");
	});

	it("redirects signed-in users without an active organization to the dashboard", async () => {
		getSession.mockResolvedValue(createSession({ activeOrganizationId: null }));

		const response = await publicMiddleware(
			createRequest("https://example.com/en/login?redirect_url=%2Fdashboard%2Fchat")
		);

		expect(response?.headers.get("location")).toBe(
			"https://example.com/en/dashboard?redirect_url=%2Fdashboard%2Fchat"
		);
	});

	it("allows unauthenticated users to continue to public pages", async () => {
		getSession.mockResolvedValue(null);

		const response = await publicMiddleware(createRequest("https://example.com/login"));

		expect(response).toBeUndefined();
	});
});
