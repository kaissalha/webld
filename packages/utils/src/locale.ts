const rtlLocales = ["ar", "fa", "he", "ur"];

const getDirection = (locale: string) => (rtlLocales.includes(locale) ? "rtl" : "ltr");

export const locale = {
	getDirection,
};
