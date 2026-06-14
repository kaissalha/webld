import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";

import { BaseLayout } from "@/components/layout/base-layout";
import { generateLocalizedStaticParams, routing } from "@/i18n/routing";
import "@starter/ui/globals.css";

export const generateStaticParams = generateLocalizedStaticParams;

export const metadata: Metadata = {
	title: {
		default: "Starter",
		template: "%s | Starter",
	},
	description: "Starter is a platform",
};

type LocaleLayoutProps = {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
	const [{ locale }, messages] = await Promise.all([params, getMessages()]);

	if (!hasLocale(routing.locales, locale)) {
		notFound();
	}

	return (
		<BaseLayout locale={locale} messages={messages}>
			{children}
		</BaseLayout>
	);
}
