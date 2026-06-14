import { Suspense } from "react";

import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Script from "next/script";

import { DirectionProvider } from "@base-ui/react/direction-provider";
import { PostHogPageView } from "@posthog/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { VercelToolbar } from "@vercel/toolbar/next";
import { ThemeProvider } from "@wrksz/themes/next";
import type { AbstractIntlMessages } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import type { Locale } from "@/i18n/routing";
import { PostHogClientEffects } from "@/lib/posthog";
import { TRPCProvider } from "@/lib/trpc";
import { getDirection } from "@/utils/get-direction";
import { Toaster } from "@webld/ui/components/sonner";

import "server-only";

import { ErrorToaster } from "../error-toaster";
import { BaseLayoutPostHogProvider } from "./base-layout-posthog-provider";

const geistSans = Geist({
	variable: "--font-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-mono",
	subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
	variable: "--font-display",
	subsets: ["latin"],
	weight: "400",
	style: ["normal", "italic"],
});

type BaseLayoutProps = {
	children: React.ReactNode;
	locale: Locale;
	messages: AbstractIntlMessages;
};

export const BaseLayout = ({ children, locale, messages }: BaseLayoutProps) => {
	const dir = getDirection(locale);

	return (
		<html
			lang={locale}
			dir={dir}
			className='notranslate'
			translate='no'
			suppressHydrationWarning
			data-scroll-behavior='smooth'
		>
			<body
				className={`${geistMono.variable} ${geistSans.variable} ${instrumentSerif.variable} antialiased overflow-x-hidden max-w-dvw`}
			>
				{(process.env.REACT_SCAN === "1" || process.env.REACT_SCAN === "true") && (
					<Script src='//unpkg.com/react-scan/dist/auto.global.js' strategy='afterInteractive' />
				)}
				<BaseLayoutPostHogProvider>
					<PostHogClientEffects />
					<PostHogPageView />

					<NextIntlClientProvider locale={locale} messages={messages}>
						<NuqsAdapter>
							<TRPCProvider>
								<DirectionProvider direction={dir}>
									<ThemeProvider attribute='class' defaultTheme='light' disableTransitionOnChange>
										<div className='flex min-h-dvh flex-col'>
											<Suspense fallback={null}>{children}</Suspense>
											<Toaster position='bottom-right' />
											<Suspense>
												<ErrorToaster />
											</Suspense>
										</div>
										<SpeedInsights />
									</ThemeProvider>
								</DirectionProvider>
							</TRPCProvider>
						</NuqsAdapter>
					</NextIntlClientProvider>
				</BaseLayoutPostHogProvider>
				{process.env.VERCEL_ENV !== "production" && <VercelToolbar />}
			</body>
			{/* {process.env.VERCEL_ENV === "production" && (
				<DubAnalytics
					apiHost='/umbra'
					domainsConfig={{
						refer: "durableai.link",
					}}
					scriptProps={{
						src: "/umbra/script.js",
					}}
				/>
			)} */}
		</html>
	);
};
