"use client";

import { useEffect } from "react";

import { ErrorPageView } from "@/components/layout/error-page-view";
import { routing } from "@/i18n/routing";
import { getDirection } from "@/utils/get-direction";
import "@webld/ui/globals.css";

type GlobalErrorProps = {
	error: Error & { digest?: string };
	reset?: () => void;
	unstable_retry?: () => void;
};

const globalErrorCopy = {
	description: "It looks like there was an error, try reloading the page",
	reloadLabel: "Reload page",
	title: "Something went wrong",
};

export default function GlobalError({ error, reset, unstable_retry }: GlobalErrorProps) {
	const locale = routing.defaultLocale;
	const dir = getDirection(locale);

	useEffect(() => {
		console.error(error);
	}, [error]);

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
		<html lang={locale} dir={dir} suppressHydrationWarning>
			<head>
				<title>{globalErrorCopy.title}</title>
			</head>
			<body className='antialiased overflow-x-hidden max-w-dvw bg-background text-foreground'>
				<ErrorPageView
					description={globalErrorCopy.description}
					onReload={handleReload}
					reloadLabel={globalErrorCopy.reloadLabel}
					title={globalErrorCopy.title}
				/>
			</body>
		</html>
	);
}
