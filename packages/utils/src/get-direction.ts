const rtlLocales = ["ar", "fa", "he", "ur"];

export const getDirection = (locale: string) => (rtlLocales.includes(locale) ? "rtl" : "ltr");
