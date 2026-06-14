import { TRPCError } from "@trpc/server";

const parseJsonValue = (payload: string): unknown | undefined => {
	try {
		return JSON.parse(payload) as unknown;
	} catch {
		return undefined;
	}
};

/**
 * Best-effort parse for untrusted or optional JSON strings (e.g. blob upload payloads).
 * Returns `{}` when missing, invalid, or not a JSON object.
 */
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

/**
 * Strict parse: requires a present string and valid JSON (any value). Throws TRPCError on failure.
 */
export const parseJsonPayload = <T = unknown>(
	payload: string | null | undefined,
	options?: { missingMessage?: string; invalidMessage?: string }
): T => {
	if (!payload) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: options?.missingMessage ?? "Missing payload.",
		});
	}
	const value = parseJsonValue(payload);
	if (value === undefined) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: options?.invalidMessage ?? "Invalid payload.",
		});
	}
	return value as T;
};
