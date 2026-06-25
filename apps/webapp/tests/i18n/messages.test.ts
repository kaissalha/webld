/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import ar from "@/i18n/messages/ar.json";
import en from "@/i18n/messages/en.json";

type JsonObject = { [key: string]: unknown };

const flattenKeys = (obj: JsonObject, prefix = ""): string[] =>
	Object.entries(obj).flatMap(([key, value]) => {
		const path = prefix ? `${prefix}.${key}` : key;
		return value !== null && typeof value === "object" && !Array.isArray(value)
			? flattenKeys(value as JsonObject, path)
			: [path];
	});

describe("message catalog parity", () => {
	const enKeys = flattenKeys(en).sort();
	const arKeys = flattenKeys(ar).sort();

	it("every English key has an Arabic counterpart", () => {
		const missing = enKeys.filter((key) => !arKeys.includes(key));
		expect(missing).toEqual([]);
	});

	it("Arabic has no keys missing from English", () => {
		const extra = arKeys.filter((key) => !enKeys.includes(key));
		expect(extra).toEqual([]);
	});
});
