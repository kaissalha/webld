import { extractUrlMetadata } from "../lib/get-url-metadata";

export const getLinkPreview = async ({ url }: { url: string }) => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 10_000);

	try {
		const response = await fetch(url, {
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; LinkPreview/1.0)",
			},
			signal: controller.signal,
		});

		if (!response.ok) {
			return null;
		}

		const html = await response.text();
		return extractUrlMetadata(html, url);
	} catch {
		return null;
	} finally {
		clearTimeout(timeoutId);
	}
};
