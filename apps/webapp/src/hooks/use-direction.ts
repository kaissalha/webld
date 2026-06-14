import { useLocale } from "next-intl";

type Direction = "rtl" | "ltr";

export const useDirection = () => {
	const locale = useLocale();

	// List of RTL languages
	const rtlLocales = ["ar", "fa", "he", "ur"];

	const dir: Direction = rtlLocales.includes(locale) ? "rtl" : "ltr";

	return { dir };
};
