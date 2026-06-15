/**
 * @vitest-environment node
 */
import { NextRequest } from "next/server";

import { describe, expect, it } from "vitest";

import { isPathExcluded, resolveRequestPath } from "@/utils/request-utils";

const ACCEPT_MD_HANDLER_PATH = "/api/accept-md";
const EXCLUDED_PATH_PREFIXES = ["/api/", "/_next/"] as const;

const createRequest = ({
	url = "https://example.com/api/accept-md",
	headers,
}: { url?: string; headers?: HeadersInit } = {}) => {
	return new NextRequest(url, { headers });
};

describe("request utils", () => {
	describe("resolveRequestPath", () => {
		it("prioritizes explicit path header over all other path sources", () => {
			const request = createRequest({
				url: "https://example.com/api/accept-md?path=query-path",
				headers: {
					"x-accept-md-path": "header-path",
					"x-matched-path": "/matched-path",
				},
			});

			expect(
				resolveRequestPath(request, {
					pathHeaderName: "x-accept-md-path",
					queryParamName: "path",
					handlerPath: ACCEPT_MD_HANDLER_PATH,
				})
			).toBe("/header-path");
		});

		it("uses matched path headers when explicit path header is missing", () => {
			const request = createRequest({
				url: "https://example.com/api/accept-md",
				headers: {
					"x-vercel-original-path": "from-matched-header",
				},
			});

			expect(
				resolveRequestPath(request, {
					pathHeaderName: "x-accept-md-path",
					queryParamName: "path",
					handlerPath: ACCEPT_MD_HANDLER_PATH,
				})
			).toBe("/from-matched-header");
		});

		it("uses query path when headers are missing", () => {
			const request = createRequest({
				url: "https://example.com/api/accept-md?path=from-query",
			});

			expect(
				resolveRequestPath(request, {
					pathHeaderName: "x-accept-md-path",
					queryParamName: "path",
					handlerPath: ACCEPT_MD_HANDLER_PATH,
				})
			).toBe("/from-query");
		});

		it("extracts path from handler route suffix", () => {
			const request = createRequest({
				url: "https://example.com/api/accept-md/blog/post",
			});

			expect(
				resolveRequestPath(request, {
					pathHeaderName: "x-accept-md-path",
					queryParamName: "path",
					handlerPath: ACCEPT_MD_HANDLER_PATH,
				})
			).toBe("/blog/post");
		});

		it("falls back to root for the handler root path", () => {
			const request = createRequest({
				url: "https://example.com/api/accept-md",
			});

			expect(
				resolveRequestPath(request, {
					pathHeaderName: "x-accept-md-path",
					queryParamName: "path",
					handlerPath: ACCEPT_MD_HANDLER_PATH,
				})
			).toBe("/");
		});

		it("falls back to request pathname for non-handler routes", () => {
			const request = createRequest({
				url: "https://example.com/about",
			});

			expect(
				resolveRequestPath(request, {
					pathHeaderName: "x-accept-md-path",
					queryParamName: "path",
					handlerPath: ACCEPT_MD_HANDLER_PATH,
				})
			).toBe("/about");
		});

		it("normalizes handler path values to root", () => {
			const request = createRequest({
				url: "https://example.com/api/accept-md?path=/api/accept-md",
			});

			expect(
				resolveRequestPath(request, {
					pathHeaderName: "x-accept-md-path",
					queryParamName: "path",
					handlerPath: ACCEPT_MD_HANDLER_PATH,
				})
			).toBe("/");
		});
	});

	describe("isPathExcluded", () => {
		it("detects excluded path prefixes", () => {
			expect(isPathExcluded("/api/internal/status", EXCLUDED_PATH_PREFIXES)).toBe(true);
			expect(isPathExcluded("/_next/static/chunks/main.js", EXCLUDED_PATH_PREFIXES)).toBe(true);
			expect(isPathExcluded("/about", EXCLUDED_PATH_PREFIXES)).toBe(false);
		});
	});
});
