/**
 * Some models return JSON Schema-shaped objects (with `type` + `properties`)
 * instead of the actual payload. Unwrap those before Zod validation.
 */
export const unwrapJsonSchemaObject = (value: unknown) => {
	if (
		value &&
		typeof value === "object" &&
		"type" in value &&
		value.type === "object" &&
		"properties" in value &&
		value.properties &&
		typeof value.properties === "object" &&
		!Array.isArray(value.properties)
	) {
		return value.properties;
	}

	return value;
};
