import { useCallback } from "react";

import { isToday, isYesterday } from "date-fns";
import { useLocale, useTranslations } from "next-intl";

/**
 * Hook that returns a function to format dates relative to today.
 *
 * The returned function will:
 * - Return "today" for today's date
 * - Return "yesterday" for yesterday's date
 * - Return a formatted date (e.g., "Jan 15") for other dates in the current year
 * - Return a formatted date with year (e.g., "Jan 15, 2023") for dates in other years
 *
 */
export const useFormatRelativeDate = () => {
	const t = useTranslations("common");
	const locale = useLocale();

	const formatDate = useCallback(
		(date: Date) => {
			if (isToday(date)) return t("today");
			if (isYesterday(date)) return t("yesterday");

			// include year only if it's not the current year
			const isCurrentYear = date.getFullYear() === new Date().getFullYear();

			return date.toLocaleDateString(locale, {
				year: isCurrentYear ? undefined : "numeric",
				month: "short",
				day: "numeric",
			});
		},
		[t, locale]
	);

	return formatDate;
};
