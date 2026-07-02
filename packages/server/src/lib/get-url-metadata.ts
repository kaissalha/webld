import { url } from "@webld/utils";

export type UrlMetadata = {
	title: string;
	description: string;
	siteName: string;
	favicon: string | null;
	url: string;
};

export const extractUrlMetadata = (html: string, originalUrl: string): UrlMetadata => {
	const extract = (pattern: RegExp, defaultValue: string = ""): string => {
		const match = html.match(pattern);
		return match ? match[1].trim() : defaultValue;
	};

	const ogTitle = extract(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
	const title = ogTitle || extract(/<title[^>]*>([^<]+)<\/title>/i);

	const ogDescription = extract(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
	const metaDescription = extract(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
	const description = ogDescription || metaDescription;

	const siteName = extract(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i);

	const favicon = extractFavicon(html, originalUrl);

	return {
		title: title || "Untitled",
		description: description.slice(0, 150) || "",
		siteName: siteName || url.getHostnameFromUrl({ url: originalUrl }),
		favicon,
		url: originalUrl,
	};
};

const extractFavicon = (html: string, originalUrl: string): string | null => {
	const patterns: RegExp[] = [
		/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
		/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i,
		/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
	];

	for (const pattern of patterns) {
		const match = html.match(pattern);

		if (match) {
			return url.resolveUrl({ href: match[1], base: originalUrl });
		}
	}

	try {
		return `${new URL(originalUrl).origin}/favicon.ico`;
	} catch {
		return null;
	}
};
