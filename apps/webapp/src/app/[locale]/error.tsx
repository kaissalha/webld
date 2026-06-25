"use client";

import { useEffect } from "react";

import { useTranslations } from "next-intl";

import { ErrorPageView } from "@/components/layout/error-page-view";
import { createErrorReloadHandler } from "@/utils/error-reload";

type ErrorProps = {
	error: Error & { digest?: string };
	reset?: () => void;
	unstable_retry?: () => void;
};

export default function LocaleError({ error, reset, unstable_retry }: ErrorProps) {
	const t = useTranslations("errorPage");

	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<ErrorPageView
			description={t("description")}
			onReload={createErrorReloadHandler(reset, unstable_retry)}
			reloadLabel={t("reload")}
			title={t("title")}
		/>
	);
}
