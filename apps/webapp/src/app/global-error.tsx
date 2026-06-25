"use client";

import { useEffect } from "react";

import { ErrorPageView } from "@/components/layout/error-page-view";
import enMessages from "@/i18n/messages/en.json";
import { routing } from "@/i18n/routing";
import { createErrorReloadHandler } from "@/utils/error-reload";
import { getDirection } from "@/utils/get-direction";
import "@webld/ui/globals.css";

type GlobalErrorProps = {
	error: Error & { digest?: string };
	reset?: () => void;
	unstable_retry?: () => void;
};

// global-error replaces the root layout when it crashes, so it renders outside
// the locale provider and can't use translation hooks. Source the copy from the
// default-locale catalog (single source of truth) rather than a duplicate object.
const { globalError } = enMessages;

export default function GlobalError({ error, reset, unstable_retry }: GlobalErrorProps) {
	const locale = routing.defaultLocale;
	const dir = getDirection(locale);

	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<html lang={locale} dir={dir} suppressHydrationWarning>
			<head>
				<title>{globalError.globalTitle}</title>
			</head>
			<body className='antialiased overflow-x-hidden max-w-dvw bg-background text-foreground'>
				<ErrorPageView
					description={globalError.globalDescription}
					onReload={createErrorReloadHandler(reset, unstable_retry)}
					reloadLabel={globalError.tryAgain}
					title={globalError.globalTitle}
				/>
			</body>
		</html>
	);
}
