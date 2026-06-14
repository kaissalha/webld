export const getBaseURL = () => {
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
		return new URL("https://starter-webapp.vercel.app");
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
