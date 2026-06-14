import {
	type MarkupComponent,
	parseMarkup,
	type TranslationKey,
	type TranslationParams,
	translations,
} from "./translations";

type Options = {
	locale?: string;
};

const supportedLocales = ["en"] as const;

export type Locale = (typeof supportedLocales)[number];

export const getI18n = ({ locale = "en" }: Options) => {
	// Ensure locale is supported, fallback to English if not
	const safeLocale = supportedLocales.includes(locale as Locale) ? (locale as Locale) : "en";

	return {
		t: (key: TranslationKey, params?: TranslationParams) => {
			const translationSet = translations(safeLocale, params);
			return translationSet[key] ?? key;
		},
		markup: (key: TranslationKey, components: MarkupComponent) => {
			const translationSet = translations(safeLocale);
			const message = translationSet[key] ?? key;
			return parseMarkup(message, components);
		},
	};
};
