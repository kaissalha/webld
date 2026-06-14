/**
 * @vitest-environment node
 */
import { NextRequest } from "next/server";

import * as acceptMdRuntimeModule from "accept-md-runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/accept-md/route";

vi.mock("accept-md-runtime", () => ({
	getMarkdownForPath: vi.fn(),
	loadConfig: vi.fn(),
}));

const createRequest = (url: string, headers?: HeadersInit) => {
	return new NextRequest(url, { headers });
};

describe("accept-md Route", () => {
	const mockGetMarkdownForPath = vi.mocked(acceptMdRuntimeModule.getMarkdownForPath);
	const mockLoadConfig = vi.mocked(acceptMdRuntimeModule.loadConfig);

	beforeEach(() => {
		vi.clearAllMocks();
		mockLoadConfig.mockReturnValue({
			cache: false,
		});
	});

	it("returns markdown with 200 on success", async () => {
		mockGetMarkdownForPath.mockResolvedValue("# Hello");

		const request = createRequest("http://localhost:3000/about");
		const response = await GET(request);

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(await response.text()).toBe("# Hello");
	});

	it("returns 404 markdown when upstream page returns 404", async () => {
		mockGetMarkdownForPath.mockRejectedValue(new Error("Failed to fetch page: 404"));

		const request = createRequest("http://localhost:3000/missing-page");
		const response = await GET(request);
		const text = await response.text();

		expect(response.status).toBe(404);
		expect(response.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
		expect(text).toContain("# 404 Not Found");
	});

	it("returns 500 json for non-fetch errors", async () => {
		mockGetMarkdownForPath.mockRejectedValue(new Error("Unexpected failure"));

		const request = createRequest("http://localhost:3000/about");
		const response = await GET(request);
		const json = await response.json();

		expect(response.status).toBe(500);
		expect(json).toEqual({ error: "Unexpected failure" });
	});

	it("returns 404 json for excluded api paths", async () => {
		const request = createRequest("http://localhost:3000/api/internal/status");
		const response = await GET(request);
		const json = await response.json();

		expect(response.status).toBe(404);
		expect(json).toEqual({ error: "Not found" });
	});
});
