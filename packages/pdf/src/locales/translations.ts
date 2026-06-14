import type { Locale } from ".";
import enMessages from "./messages/en.json";

export type TranslationParams = {
	[key: string]: string | number | undefined;
};

type Join<K, P> = K extends string | number
	? P extends string | number
		? `${K}${P extends "" ? "" : "."}${P}`
		: never
	: never;

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...0[]];

type Paths<T, D extends number = 10> = [D] extends [never]
	? never
	: T extends object
		? {
				[K in keyof T]-?: K extends string | number ? `${K}` | Join<K, Paths<T[K], Prev[D]>> : never;
			}[keyof T]
		: "";

export type TranslationKey = Paths<typeof enMessages>;

type TranslationSet = {
	[K in TranslationKey]: string;
};

type Messages = {
	[key: string]: string | Record<string, unknown>;
};

const localeMessages = {
	en: enMessages,
} satisfies Record<Locale, Messages>;

const flattenMessages = (messages: Messages, prefix = ""): Record<string, string> => {
	return Object.keys(messages).reduce((acc: Record<string, string>, key: string) => {
		const prefixedKey = prefix ? `${prefix}.${key}` : key;
		if (typeof messages[key] === "string") {
			acc[prefixedKey] = messages[key] as string;
		} else if (typeof messages[key] === "object") {
			Object.assign(acc, flattenMessages(messages[key] as Messages, prefixedKey));
		}
		return acc;
	}, {});
};

export const translations = (locale: Locale, params?: TranslationParams): TranslationSet => {
	const interpolateMessage = (message: string, params?: TranslationParams): string => {
		if (!params) return message;
		return Object.entries(params).reduce(
			(acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), String(value ?? "")),
			message
		);
	};

	const messages = flattenMessages(localeMessages[locale]);
	const englishMessages = flattenMessages(localeMessages.en);
	const translationSet = {} as TranslationSet;

	Object.keys(englishMessages).forEach((key) => {
		const message = messages[key] || englishMessages[key];
		if (message) {
			const interpolated = interpolateMessage(message, params);
			translationSet[key as TranslationKey] = interpolated;
		}
	});

	return translationSet;
};
