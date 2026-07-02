import { HTTPException } from "hono/http-exception";

const parseJsonValue = (payload: string): unknown | undefined => {
	try {
		return JSON.parse(payload) as unknown;
	} catch {
		return undefined;
	}
};

export const parseJsonRecord = (payload: string | null | undefined): Record<string, unknown> => {
	if (!payload) {
		return {};
	}

	const value = parseJsonValue(payload);
	if (typeof value === "object" && value !== null) {
		return value as Record<string, unknown>;
	}

	return {};
};

export const parseJsonPayload = <T = unknown>(
	payload: string | null | undefined,
	options?: { missingMessage?: string; invalidMessage?: string }
): T => {
	if (!payload) {
		throw new HTTPException(400, {
			message: options?.missingMessage ?? "Missing payload.",
		});
	}

	const value = parseJsonValue(payload);
	if (value === undefined) {
		throw new HTTPException(400, {
			message: options?.invalidMessage ?? "Invalid payload.",
		});
	}

	return value as T;
};
