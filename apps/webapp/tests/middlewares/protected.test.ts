/**
 * @vitest-environment node
 */
import { NextRequest } from "next/server";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession } = vi.hoisted(() => ({
	getSession: vi.fn(),
}));

vi.mock("@starter/server/auth", () => ({
	auth: {
		api: {
			getSession,
		},
	},
}));

import { protectedMiddleware } from "@/middlewares/protected";

const createRequest = (url: string) => new NextRequest(url);

const createSession = ({ activeOrganizationId }: { activeOrganizationId?: string | null }) => ({
	session: {
		activeOrganizationId,
	},
});

describe("protectedMiddleware", () => {
	beforeEach(() => {
		getSession.mockReset();
	});

	it("redirects unauthenticated users to login and preserves the requested path", async () => {
		getSession.mockResolvedValue(null);

		const response = await protectedMiddleware(createRequest("https://example.com/en/dashboard/notes"));

		expect(response?.headers.get("location")).toBe(
			"https://example.com/en/login?redirect_url=%2Fen%2Fdashboard%2Fnotes"
		);
	});

	it("allows authenticated users without an active organization through", async () => {
		getSession.mockResolvedValue(createSession({ activeOrganizationId: null }));

		const response = await protectedMiddleware(
			createRequest("https://example.com/en/dashboard/notes?filter=recent")
		);

		expect(response).toBeUndefined();
	});
});
