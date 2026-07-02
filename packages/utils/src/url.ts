const getBaseURL = () => {
	// Client
	if (typeof window !== "undefined") {
		// This will always be accurate
		const origin = window.location?.origin;
		if (origin) {
			try {
				return new URL("/", origin);
			} catch {
				// fall through to server-side/env fallback
			}
		}
	}

	if (
		process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF === "main" ||
		process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF === "master"
	) {
		return new URL("https://webld-webapp.vercel.app");
	}

	// Fallback for branch deployments
	if (process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL) {
		return new URL(`https://${process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL}`);
	}

	// Fallback for preview deployments
	if (process.env.NEXT_PUBLIC_VERCEL_URL) {
		return new URL(`https://${process.env.NEXT_PUBLIC_VERCEL_URL}`);
	}

	return new URL("http://localhost:3000");
};

const getHostnameFromUrl = ({ url }: { url: string }) => {
	try {
		return new URL(url).hostname.replace(/^www\./i, "");
	} catch {
		return url;
	}
};

const resolveUrl = ({ href, base }: { href: string; base: string }) => {
	if (href.startsWith("//")) {
		return `https:${href}`;
	}

	if (href.startsWith("/")) {
		return new URL(href, base).href;
	}

	if (href.startsWith("http")) {
		return href;
	}

	return new URL(href, base).href;
};

export const url = {
	getBaseURL,
	getHostnameFromUrl,
	resolveUrl,
};
