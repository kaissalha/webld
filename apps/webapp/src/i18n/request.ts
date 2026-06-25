import { locale as rootLocale } from "next/root-params";

import deepmerge from "deepmerge";
import { type AbstractIntlMessages, hasLocale, IntlErrorCode } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_TIME_ZONE, routing } from "./routing";

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
	// Non-default locales fall back to the default locale for any key they're missing.
	const messages: AbstractIntlMessages = deepmerge(defaultMessages, userMessages);

	return {
		locale,
		messages,
		timeZone: DEFAULT_TIME_ZONE,
		onError(error) {
			// Missing messages already fall back (deepmerge + getMessageFallback),
			// so don't make noise about them in production; surface everything else.
			if (error.code === IntlErrorCode.MISSING_MESSAGE && process.env.NODE_ENV === "production") {
				return;
			}
			console.error(error);
		},
		getMessageFallback({ namespace, key }) {
			// Last-resort fallback when a key is missing in every locale: render the
			// dotted path instead of throwing or showing an empty string.
			return [namespace, key].filter(Boolean).join(".");
		},
	};
});
