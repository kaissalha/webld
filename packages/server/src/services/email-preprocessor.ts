type PreprocessResult = {
	html: string;
	hasBlockedImages: boolean;
};

const TRACKING_PIXEL_RE = /<img\b[^>]*(?:width\s*=\s*["']?[01]|height\s*=\s*["']?[01])[^>]*\/?>/gi;

const PREHEADER_RE =
	/<(?:div|span|td)[^>]*class\s*=\s*["'][^"']*preheader[^"']*["'][^>]*style\s*=\s*["'][^"']*(?:display\s*:\s*none|font-size\s*:\s*0|line-height\s*:\s*0|max-height\s*:\s*0|opacity\s*:\s*0)[^"']*["'][^>]*>[\s\S]*?<\/(?:div|span|td)>/gi;

const TITLE_RE = /<title\b[^>]*>[\s\S]*?<\/title>/gi;

const LINK_TARGET_RE = /(<a\b)(?![^>]*\btarget\s*=)/gi;
const LINK_REL_RE = /(<a\b)(?![^>]*\brel\s*=)/gi;

const BLOCKQUOTE_RE = /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi;
const GMAIL_QUOTE_RE = /<div\b[^>]*class\s*=\s*["']gmail_quote["'][^>]*>([\s\S]*?)<\/div>/gi;

const collapseQuoted = (html: string, pattern: RegExp) =>
	html.replace(pattern, (_match, inner: string) => {
		return `<details class="quoted-toggle" style="margin-top:0.75em;border-inline-start:2px solid #d1d5db;padding-inline-start:8px;">
<summary style="cursor:pointer;color:#6b7280;list-style:none;user-select:none;font-size:0.8em;">Show quoted text</summary>
${inner}
</details>`;
	});

export const preprocessEmailHtml = (rawHtml: string, { blockRemoteImages = false } = {}): PreprocessResult => {
	let html = rawHtml;
	let hasBlockedImages = false;

	html = html.replace(TRACKING_PIXEL_RE, "");
	html = html.replace(PREHEADER_RE, "");
	html = html.replace(TITLE_RE, "");

	html = html.replace(LINK_TARGET_RE, '$1 target="_blank"');
	html = html.replace(LINK_REL_RE, '$1 rel="noopener noreferrer"');

	html = collapseQuoted(html, BLOCKQUOTE_RE);
	html = collapseQuoted(html, GMAIL_QUOTE_RE);

	if (blockRemoteImages) {
		html = html.replace(/<img\b[^>]*\bsrc\s*=\s*["'](?!cid:)([^"']+)["'][^>]*\/?>/gi, () => {
			hasBlockedImages = true;
			return "";
		});
	}

	return { html, hasBlockedImages };
};
