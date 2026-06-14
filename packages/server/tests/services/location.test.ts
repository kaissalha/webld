import { describe, expect, it, vi } from "vitest";

const { betterFetch, headersMock } = vi.hoisted(() => ({
	betterFetch: vi.fn(),
	headersMock: vi.fn(),
}));

vi.mock("@better-fetch/fetch", () => ({
	betterFetch,
}));

vi.mock("next/headers", () => ({
	headers: headersMock,
}));

import {
	formatLocationFromGooglePlace,
	getGooglePlaceDetails,
	getLocation,
	getLocationFromHeaders,
} from "../../src/services/location";

describe("location service", () => {
	it("formats Google place data", () => {
		const location = formatLocationFromGooglePlace({
			id: "place-1",
			formattedAddress: "123 Main St, New York, NY 10001, USA",
			addressComponents: [
				{ longText: "123", shortText: "123", types: ["street_number"], languageCode: "en" },
				{ longText: "Main St", shortText: "Main St", types: ["route"], languageCode: "en" },
				{ longText: "New York", shortText: "NYC", types: ["locality"], languageCode: "en" },
				{ longText: "New York", shortText: "NY", types: ["administrative_area_level_1"], languageCode: "en" },
				{ longText: "10001", shortText: "10001", types: ["postal_code"], languageCode: "en" },
				{ longText: "United States", shortText: "US", types: ["country"], languageCode: "en" },
			],
		});

		expect(location.addressLine1).toBe("123 Main St");
		expect(location.city).toBe("New York");
		expect(location.countryCode).toBe("us");
	});

	it("fetches Google place details", async () => {
		betterFetch.mockResolvedValue({
			data: {
				id: "place-1",
				formattedAddress: "123 Main St, New York, NY 10001, USA",
				addressComponents: [
					{ longText: "123", shortText: "123", types: ["street_number"], languageCode: "en" },
					{ longText: "Main St", shortText: "Main St", types: ["route"], languageCode: "en" },
					{ longText: "New York", shortText: "NYC", types: ["locality"], languageCode: "en" },
					{ longText: "United States", shortText: "US", types: ["country"], languageCode: "en" },
				],
			},
			error: null,
		});

		const location = await getGooglePlaceDetails({ placeId: "place-1" });

		expect(location.countryCode).toBe("us");
	});

	it("falls back to headers when no place info", async () => {
		headersMock.mockResolvedValue(
			new Headers({
				"x-vercel-ip-country": "ca",
				"x-vercel-ip-city": "Toronto",
			})
		);

		const location = await getLocationFromHeaders();

		expect(location.countryCode).toBe("ca");
	});

	it("routes getLocation by input", async () => {
		betterFetch.mockResolvedValue({
			data: {
				id: "place-1",
				formattedAddress: "123 Main St, New York, NY 10001, USA",
				addressComponents: [
					{ longText: "United States", shortText: "US", types: ["country"], languageCode: "en" },
				],
			},
			error: null,
		});

		const byPlaceId = await getLocation({ placeId: "place-1" });
		expect(byPlaceId.countryCode).toBe("us");
	});
});
