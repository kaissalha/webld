import { headers } from "next/headers";

import { betterFetch } from "@better-fetch/fetch";
import { getCountryData, type TCountryCode } from "countries-list";
import { z } from "zod";

import { logger } from "@webld/logger/server";

export type Place = google.maps.places.PlaceResult;

export type LocationFields = {
	addressLine1: string;
	addressLine2?: string;
	city: string;
	state?: string;
	countryCode: string; // ISO 3166-1 alpha-2
	country: string;
	postalCode?: string;
	currencyCode?: string; // ISO 4217
};

const addressComponentSchema = z.object({
	longText: z.string(),
	shortText: z.string(),
	types: z.array(z.string()),
	languageCode: z.string(),
});

const apiPlaceSchema = z.object({
	id: z.string(),
	formattedAddress: z.string().optional(),
	addressComponents: z.array(addressComponentSchema).optional(),
	geometry: z
		.object({
			location: z.object({
				lat: z.number(),
				lng: z.number(),
			}),
		})
		.optional(),
});

const placeSearchTextResponseSchema = z.object({
	places: z.array(apiPlaceSchema),
	nextPageToken: z.string().optional(),
	searchUri: z.string().optional(),
});

export type ApiPlace = z.infer<typeof apiPlaceSchema>;
export type PlaceSearchTextResponse = z.infer<typeof placeSearchTextResponseSchema>;

const GOOGLE_PLACES_API_URL = "https://places.googleapis.com/v1/places";

const REQUIRED_FIELDS = ["addressComponents", "formattedAddress", "id"];

export const getGooglePlaceDetails = async ({ placeId }: { placeId: string }) => {
	if (!process.env.GOOGLE_MAPS_BACKEND_KEY) {
		throw new Error("Google Maps API key is not set");
	}

	const { data, error } = await betterFetch<ApiPlace>(`${GOOGLE_PLACES_API_URL}/${placeId}`, {
		headers: {
			"X-Goog-Api-Key": process.env.GOOGLE_MAPS_BACKEND_KEY,
			"X-Goog-FieldMask": REQUIRED_FIELDS.join(","),
		},
	});

	if (error || !data) {
		throw new Error(`Failed to fetch place details: ${error?.message ?? "Unknown error"}`);
	}

	const validatedData = apiPlaceSchema.parse(data);

	return formatLocationFromGooglePlace(validatedData);
};

export const getGooglePlaceDetailsByText = async ({ textQuery }: { textQuery: string }) => {
	if (!process.env.GOOGLE_MAPS_BACKEND_KEY) {
		throw new Error("Google Maps API key is not set");
	}

	const { data, error } = await betterFetch<PlaceSearchTextResponse>(`${GOOGLE_PLACES_API_URL}:searchText`, {
		method: "POST",
		headers: {
			"X-Goog-Api-Key": process.env.GOOGLE_MAPS_BACKEND_KEY,
			"X-Goog-FieldMask": REQUIRED_FIELDS.map((field) => `places.${field}`).join(","),
		},
		body: JSON.stringify({
			textQuery,
		}),
	});

	if (error || !data) {
		throw new Error("Failed to fetch place details");
	}

	const validatedData = placeSearchTextResponseSchema.parse(data);

	if (validatedData.places.length === 0) {
		throw new Error("Failed to fetch place details");
	}

	return formatLocationFromGooglePlace(validatedData.places[0]);
};

type GetLocationInput = {
	placeId?: string;
	businessLocation?: string;
};

/**
 * Formats Google Place data into the shape of locationFields
 */
export const formatLocationFromGooglePlace = (place: ApiPlace): LocationFields => {
	const street_number = place.addressComponents?.find((comp) => comp.types.includes("street_number"))?.longText || "";

	const street = place.addressComponents?.find((comp) => comp.types.includes("route"))?.longText || "";

	const city =
		place.addressComponents?.find((comp) => comp.types.includes("locality"))?.longText ||
		place.addressComponents?.find((comp) => comp.types.includes("postal_town"))?.longText ||
		"";

	const state =
		place.addressComponents?.find((comp) => comp.types.includes("administrative_area_level_1"))?.longText || "";

	const postalCode = place.addressComponents?.find((comp) => comp.types.includes("postal_code"))?.longText || "";

	const countryBase = place.addressComponents?.find((comp) => comp.types.includes("country"));

	const countryCode = countryBase?.shortText?.toLowerCase() || "us";
	const country = countryBase?.longText || "United States";

	const countryData = getCountryData(countryCode.toUpperCase() as TCountryCode);
	const currencyCode = countryData?.currency?.[0] || "USD";

	const addressLine1 =
		street_number && street ? `${street_number} ${street}` : place.formattedAddress?.split(",")[0] || "";

	return {
		addressLine1,
		city,
		state,
		country,
		countryCode,
		postalCode,
		currencyCode,
	};
};

/**
 * Attempts to get location information from request headers
 */
export const getLocationFromHeaders = async (): Promise<LocationFields> => {
	try {
		const headersList = await headers();

		// Get the approximate location from headers
		// Common headers that might indicate location
		const countryCode = decodeURIComponent(headersList.get("x-vercel-ip-country")?.toLowerCase() || "us");
		const city = decodeURIComponent(headersList.get("x-vercel-ip-city")?.toLowerCase() || "new york");

		const countryData = getCountryData(countryCode.toUpperCase() as TCountryCode);
		const country = countryData?.name || "United States";

		return {
			country,
			countryCode,
			// We don't have detailed info from headers alone
			addressLine1: "",
			city,
			state: "",
			postalCode: "",
			currencyCode: countryData?.currency?.[0] || "USD",
		};
	} catch (error) {
		logger.error({
			error,
			message: "Error getting location from headers",
		});
		return {
			country: "United States",
			countryCode: "us",
			addressLine1: "",
			city: "",
			state: "",
			postalCode: "",
			currencyCode: "USD",
		};
	}
};

export const getLocation = async ({ placeId, businessLocation }: GetLocationInput) => {
	if (placeId) return await getGooglePlaceDetails({ placeId });

	if (businessLocation) return await getGooglePlaceDetailsByText({ textQuery: businessLocation });

	return getLocationFromHeaders();
};

export const getTimezone = async (): Promise<string> => {
	const headersList = await headers();
	const timezone = headersList.get("x-vercel-ip-timezone") || "America/New_York";
	return timezone;
};
