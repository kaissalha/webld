import type { Locale } from "next-intl";

import enMessages from "@/i18n/messages/en.json";

type GetNestedValueOptions<T, D> = {
	obj: T;
	path: string;
	defaultValue?: D;
};

/**
 * Get a value from a nested object using a dot-separated path
 */
export const getNestedValue = <T extends Record<string, unknown>, D = string>({
	obj,
	path,
	defaultValue = path as D,
}: GetNestedValueOptions<T, D>): D => {
	const parts = path.split(".");
	let current: unknown = obj;

	for (const part of parts) {
		if (typeof current !== "object" || current === null || !(part in current)) {
			return defaultValue;
		}
		current = (current as Record<string, unknown>)[part];
	}

	return current as D;
};

/**
 * Create a translation function that uses English messages
 * @param namespace The namespace to use for translations (e.g. "dashboard.settings.business.form")
 */
export const createEnglishTranslator = (namespace: string) => {
	const namespaceObj = getNestedValue({
		obj: enMessages,
		path: namespace,
		defaultValue: {},
	});
	return (key: string) => getNestedValue({ obj: namespaceObj, path: key, defaultValue: key });
};

export const localeMap: Record<Locale, string> = {
	en: "en-US",
	ar: "ar",
};
