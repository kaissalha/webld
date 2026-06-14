import type { Metadata } from "next";

import { getTranslations } from "next-intl/server";

import { LoginPageClient } from "./login-page-client";

export const generateMetadata = async (): Promise<Metadata> => {
	const t = await getTranslations("account.login");

	return {
		title: t("pageTitle"),
	};
};

export default function LoginPage() {
	return <LoginPageClient />;
}
