import { getTranslations } from "@/lib/i18n";
import { getTimezone } from "@webld/server";

/**
 * Gets the greeting type based on the hour of the day
 * @param hour - Hour in 24-hour format (0-23)
 */
export const getGreetingFromHour = async (hour: number) => {
	const t = await getTranslations("dashboard.home.greeting");

	if (hour >= 5 && hour < 12) {
		return t("morning");
	} else if (hour >= 12 && hour < 17) {
		return t("afternoon");
	}

	return t("evening");
};

/**
 * Gets the greeting type based on a timezone string
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 */
export const getGreetingFromTimezone = async () => {
	const timezone = await getTimezone();
	try {
		const now = new Date();
		const formatter = new Intl.DateTimeFormat("en-US", {
			timeZone: timezone,
			hour: "numeric",
			hour12: false,
		});
		const hour = parseInt(formatter.format(now), 10);
		return await getGreetingFromHour(hour);
	} catch {
		// Fallback to morning if timezone is invalid
		return "morning";
	}
};
