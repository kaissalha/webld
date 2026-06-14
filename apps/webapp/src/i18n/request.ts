import { locale as rootLocale } from "next/root-params";

import deepmerge from "deepmerge";
import { type AbstractIntlMessages, hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

export default getRequestConfig(async ({ locale }) => {
	if (!locale) {
		const paramValue = await rootLocale();
		if (hasLocale(routing.locales, paramValue)) {
			locale = paramValue;
		} else {
			locale = routing.defaultLocale;
		}
	}

	const userMessages = (await import(`./messages/${locale}.json`)).default;
	const defaultMessages = (await import(`./messages/${routing.defaultLocale}.json`)).default;
	const messages: AbstractIntlMessages = deepmerge(defaultMessages, userMessages);

	return {
		locale,
		messages,
	};
});
