import { locales } from "@/i18n/routing";

const defaultRedirectPath = "/dashboard";

const isInvalidRedirectPath = ({ path }: { path: string }) => {
	return (
		path === "/" ||
		path.startsWith("/login") ||
		path.startsWith("/signup") ||
		path.startsWith("/onboarding") ||
		path.startsWith("//")
	);
};

export const getOnboardingRedirectPath = ({ redirectUrl }: { redirectUrl?: string | string[] | undefined }) => {
	const value = Array.isArray(redirectUrl) ? redirectUrl[0] : redirectUrl;

	if (!value || !value.startsWith("/")) {
		return defaultRedirectPath;
	}

	const localePattern = new RegExp(`^/(?:${locales.join("|")})(?=/|\\?|$)`);
	const sanitizedPath = value.replace(localePattern, "") || "/";

	if (isInvalidRedirectPath({ path: sanitizedPath })) {
		return defaultRedirectPath;
	}

	return sanitizedPath;
};

export const buildOrganizationSlug = ({ name, suffix }: { name: string; suffix?: string }) => {
	const normalizedSlug = name
		.normalize("NFKD")
		.toLowerCase()
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9\s-]/g, "")
		.trim()
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");

	if (!suffix) {
		return normalizedSlug || "organization";
	}

	return `${normalizedSlug || "organization"}-${suffix}`;
};
