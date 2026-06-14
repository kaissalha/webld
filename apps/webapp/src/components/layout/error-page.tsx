"use client";

import { useEffect } from "react";

import { usePostHog } from "@posthog/next";
import { useTranslations } from "next-intl";

import { ErrorPageView } from "./error-page-view";

export type ErrorPageProps = {
	/**
	 * The error that occurred
	 */
	error?: Error & { digest?: string };
	/**
	 * Function to reset the error boundary
	 */
	reset?: () => void;
	/**
	 * Retry function used by Next.js 16 root and segment error boundaries
	 */
	unstable_retry?: () => void;
};

/**
 * Error page component designed to be used in error.tsx error boundaries
 */
export const ErrorPage = ({ error, reset, unstable_retry }: ErrorPageProps) => {
	const t = useTranslations("errorPage");
	const posthog = usePostHog();

	useEffect(() => {
		if (process.env.NEXT_PUBLIC_CAPTURE_ERRORS === "true" && error) {
			posthog?.captureException(error);
		}
	}, [error, posthog]);

	const handleReload = () => {
		if (unstable_retry) {
			unstable_retry();
		} else if (reset) {
			reset();
		} else {
			window.location.reload();
		}
	};

	return (
		<ErrorPageView
			description={t("description")}
			onReload={handleReload}
			reloadLabel={t("reload")}
			title={t("title")}
		/>
	);
};
