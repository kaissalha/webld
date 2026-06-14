import { describe, expect, it } from "vitest";

import { preprocessEmailHtml } from "../../src/services/email-preprocessor";

describe("preprocessEmailHtml", () => {
	it("removes tracking pixels, preheaders, and title tags while hardening links", () => {
		const { hasBlockedImages, html } = preprocessEmailHtml(`
			<title>Ignore me</title>
			<div class="email-preheader" style="display:none;font-size:0;">Sneaky preview</div>
			<a href="https://example.com">Open</a>
			<img src="https://example.com/pixel.png" width="1" height="1" />
		`);

		expect(hasBlockedImages).toBe(false);
		expect(html).not.toContain("<title");
		expect(html).not.toContain("Sneaky preview");
		expect(html).not.toContain("pixel.png");
		expect(html).toContain('target="_blank"');
		expect(html).toContain('rel="noopener noreferrer"');
	});

	it("collapses quoted sections into toggle blocks", () => {
		const { html } = preprocessEmailHtml(`
			<blockquote><p>Prior message</p></blockquote>
			<div class="gmail_quote"><p>Thread history</p></div>
		`);

		expect(html).toContain('class="quoted-toggle"');
		expect(html).toContain("Show quoted text");
		expect(html).toContain("Prior message");
		expect(html).toContain("Thread history");
	});

	it("blocks only remote images when requested and preserves cid attachments", () => {
		const { hasBlockedImages, html } = preprocessEmailHtml(
			`
				<img src="https://cdn.example.com/chart.png" alt="remote" />
				<img src="cid:inline-image" alt="inline" />
			`,
			{ blockRemoteImages: true }
		);

		expect(hasBlockedImages).toBe(true);
		expect(html).not.toContain("chart.png");
		expect(html).toContain("cid:inline-image");
	});
});
