import type { Metadata } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";

import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { getTranslations } from "@/lib/i18n";
import { auth } from "@starter/server/auth";

import { OnboardingClient } from "./components/onboarding-client";
import { getOnboardingRedirectPath } from "./components/onboarding-utils";

type OnboardingPageProps = {
	searchParams: Promise<{ redirect_url?: string | string[] | undefined }>;
};

export const generateMetadata = async (): Promise<Metadata> => {
	const t = await getTranslations("onboarding");

	return {
		title: t("title"),
		description: t("description"),
	};
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
	await connection();

	const headersPromise = headers();
	const sessionPromise = headersPromise.then((requestHeaders) =>
		auth.api.getSession({
			headers: requestHeaders,
		})
	);
	const [{ redirect_url: redirectUrl }, locale, session] = await Promise.all([
		searchParams,
		getLocale(),
		sessionPromise,
	]);

	if (!session) {
		redirect({ href: "/login", locale });
		return null;
	}

	const redirectPath = getOnboardingRedirectPath({ redirectUrl });

	if (session.session.activeOrganizationId) {
		redirect({ href: redirectPath, locale });
	}

	return <OnboardingClient redirectPath={redirectPath} userEmail={session.user.email} />;
}
