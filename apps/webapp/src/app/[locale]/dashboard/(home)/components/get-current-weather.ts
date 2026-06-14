import { z } from "zod";

import { logger } from "@starter/logger/server";

import "server-only";

type RequestHeaders = Pick<Headers, "get">;

const oneCallResponseSchema = z.object({
	current: z.object({
		temp: z.number(),
		weather: z
			.array(
				z.object({
					description: z.string(),
					icon: z.string(),
				})
			)
			.min(1),
	}),
});

export type CurrentWeather = {
	description: string;
	iconUrl: string;
	temperature: number;
	temperatureUnit: "C" | "F";
};

type CachedWeatherLocation = {
	countryCode: string | null;
	latitude: string;
	longitude: string;
};

const getWeatherLocation = ({ requestHeaders }: { requestHeaders: RequestHeaders }) => {
	if (!process.env.OPENWEATHER_API_KEY) {
		return null;
	}

	const latitude = Number(requestHeaders.get("x-vercel-ip-latitude"));
	const longitude = Number(requestHeaders.get("x-vercel-ip-longitude"));

	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return null;
	}

	return {
		countryCode: requestHeaders.get("x-vercel-ip-country")?.toLowerCase() ?? null,
		latitude: latitude.toFixed(4),
		longitude: longitude.toFixed(4),
	} satisfies CachedWeatherLocation;
};

const getCachedCurrentWeather = async ({ countryCode, latitude, longitude }: CachedWeatherLocation) => {
	"use cache";

	const apiKey = process.env.OPENWEATHER_API_KEY;

	if (!apiKey) {
		return null;
	}

	const units = countryCode === "us" ? "imperial" : "metric";
	const openWeatherUrl = new URL("https://api.openweathermap.org/data/3.0/onecall");
	openWeatherUrl.searchParams.set("lat", latitude);
	openWeatherUrl.searchParams.set("lon", longitude);
	openWeatherUrl.searchParams.set("appid", apiKey);
	openWeatherUrl.searchParams.set("units", units);

	try {
		const response = await fetch(openWeatherUrl);

		if (!response.ok) {
			logger.warn({
				message: "Failed to fetch current weather",
				metadata: {
					status: response.status,
					latitude,
					longitude,
				},
			});
			return null;
		}

		const data = oneCallResponseSchema.parse(await response.json());
		const [primaryCondition] = data.current.weather;

		return {
			description: primaryCondition.description,
			iconUrl: `https://openweathermap.org/img/wn/${primaryCondition.icon}@2x.png`,
			temperature: Math.round(data.current.temp),
			temperatureUnit: units === "imperial" ? "F" : "C",
		} satisfies CurrentWeather;
	} catch (error) {
		logger.error({
			error,
			message: "Failed to load current weather",
			metadata: {
				latitude,
				longitude,
			},
		});
		return null;
	}
};

export const getCurrentWeather = async ({ requestHeaders }: { requestHeaders: RequestHeaders }) => {
	const location = getWeatherLocation({ requestHeaders });

	if (!location) {
		return null;
	}

	return getCachedCurrentWeather(location);
};
