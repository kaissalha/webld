import { describe, expect, it } from "vitest";

import { file } from "../src/file";
import { url } from "../src/url";
import { user } from "../src/user";

describe("getHostnameFromUrl", () => {
	it("strips www and returns hostname", () => {
		expect(url.getHostnameFromUrl({ url: "https://www.example.com/path" })).toBe("example.com");
	});

	it("returns the original value when parsing fails", () => {
		expect(url.getHostnameFromUrl({ url: "not-a-url" })).toBe("not-a-url");
	});
});

describe("resolveUrl", () => {
	it("resolves protocol-relative, root-relative, and relative URLs", () => {
		const base = "https://example.com/page";

		expect(url.resolveUrl({ href: "//cdn.example.com/icon.png", base })).toBe("https://cdn.example.com/icon.png");
		expect(url.resolveUrl({ href: "/favicon.ico", base })).toBe("https://example.com/favicon.ico");
		expect(url.resolveUrl({ href: "assets/icon.png", base })).toBe("https://example.com/assets/icon.png");
	});
});

describe("getFileExtension", () => {
	it("prefers filename extensions and falls back to media type", () => {
		expect(file.getFileExtension({ filename: "notes.md", mediaType: "text/plain" })).toBe("md");
		expect(file.getFileExtension({ filename: "upload", mediaType: "application/pdf" })).toBe("pdf");
	});

	it("uses the provided fallback when no extension is found", () => {
		expect(file.getFileExtension({ filename: "upload", mediaType: "", fallback: "bin" })).toBe("bin");
	});
});

describe("getExtensionFromMediaType", () => {
	it("normalizes structured media types", () => {
		expect(file.getExtensionFromMediaType({ mediaType: "application/vnd.openxmlformats+json" })).toBe(
			"vnd.openxmlformats"
		);
		expect(file.getExtensionFromMediaType({ mediaType: "image/svg+xml; charset=utf-8" })).toBe("svg");
	});
});

describe("getDisplayFileExtension", () => {
	it("returns uppercase labels for UI display", () => {
		expect(file.getDisplayFileExtension({ filename: "report.pdf", mediaType: "application/pdf" })).toBe("PDF");
		expect(file.getDisplayFileExtension({ filename: undefined, mediaType: "image/png" })).toBe("PNG");
	});
});

describe("getPersonInitials", () => {
	it("uses email fallback and two-character single-token initials", () => {
		expect(user.getPersonInitials({ name: null, email: "kais@example.com" })).toBe("KA");
		expect(user.getPersonInitials({ name: "Kais Salha", email: "kais@example.com" })).toBe("KS");
	});
});
