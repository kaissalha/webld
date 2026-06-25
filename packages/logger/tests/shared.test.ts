import { afterEach, describe, expect, it, vi } from "vitest";

import {
	buildExceptionProperties,
	buildLogAttributes,
	createLogger,
	restoreError,
	serializeError,
	serializeValue,
} from "../src/shared";

describe("shared logger helpers", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("serializes complex values into log-safe data", () => {
		const date = new Date("2024-01-02T03:04:05.000Z");
		const symbol = Symbol("trace");
		const nullPrototypeObject = Object.assign(Object.create(null), {
			when: date,
		});
		const serialized = serializeValue({
			array: [1, BigInt(9), symbol],
			date,
			error: new Error("boom"),
			fn: function namedHandler() {
				return undefined;
			},
			nested: nullPrototypeObject,
		}) as Record<string, unknown>;

		expect(serialized.date).toBe("2024-01-02T03:04:05.000Z");
		expect(serialized.fn).toBe("[Function namedHandler]");
		expect(serialized.array).toEqual([1, "9", "Symbol(trace)"]);
		expect(serialized.nested).toEqual({
			when: "2024-01-02T03:04:05.000Z",
		});
		expect(serialized.error).toMatchObject({
			message: "boom",
			name: "Error",
		});
	});

	it("serializes non-Error inputs passed to serializeError", () => {
		expect(serializeError({ code: 400, message: "Bad request" })).toEqual({
			code: 400,
			message: "Bad request",
		});
	});

	it("builds log attributes for metadata, ids, and nested errors", () => {
		const error = new Error("Failed to sync");
		error.name = "SyncError";
		error.cause = { step: "upload" };

		const attributes = buildLogAttributes({
			distinctId: "distinct-1",
			error,
			level: "error",
			metadata: {
				emptyArray: [],
				flags: [true, false],
				mixedArray: [1, "two"],
				nested: { ok: true },
				total: 4,
			},
			sessionId: "session-1",
		});

		expect(attributes).toEqual({
			emptyArray: "[]",
			errorCause: JSON.stringify({ step: "upload" }),
			errorMessage: "Failed to sync",
			errorName: "SyncError",
			errorStack: expect.any(String),
			flags: [true, false],
			level: "error",
			mixedArray: JSON.stringify([1, "two"]),
			nested: JSON.stringify({ ok: true }),
			posthogDistinctId: "distinct-1",
			sessionId: "session-1",
			total: 4,
		});
	});

	it("restores errors from strings, objects, and fallbacks", () => {
		const stringError = restoreError({
			error: "Timed out",
			fallbackMessage: "Fallback",
		});
		const objectError = restoreError({
			error: {
				message: "Permission denied",
				name: "AccessError",
				stack: "custom-stack",
			},
			fallbackMessage: "Fallback",
		});
		const fallbackError = restoreError({
			error: null,
			fallbackMessage: "Fallback",
		});

		expect(stringError.message).toBe("Timed out");
		expect(objectError.name).toBe("AccessError");
		expect(objectError.stack).toBe("custom-stack");
		expect(fallbackError.message).toBe("Fallback");
	});

	it("builds exception properties with serialized metadata and message", () => {
		const props = buildExceptionProperties({
			message: "Failed to send email",
			metadata: {
				retryAt: new Date("2024-02-01T00:00:00.000Z"),
			},
		});

		expect(props).toEqual({
			message: "Failed to send email",
			retryAt: "2024-02-01T00:00:00.000Z",
		});
	});

	it("logs to the console in development and forwards exceptions only for error logs", () => {
		vi.stubEnv("NODE_ENV", "development");

		const sendException = vi.fn();
		const sendLog = vi.fn();
		const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const logger = createLogger({
			sendException,
			sendLog,
		});

		logger.info({
			message: "Background sync complete",
			metadata: { count: 2 },
		});
		logger.error({
			error: "boom",
			message: "Failed to sync",
		});

		expect(infoSpy).toHaveBeenCalledWith("Background sync complete", { count: 2 });
		expect(errorSpy).toHaveBeenCalledWith("Failed to sync", "boom");
		expect(sendLog).toHaveBeenNthCalledWith(1, {
			level: "info",
			message: "Background sync complete",
			metadata: { count: 2 },
			error: undefined,
		});
		expect(sendException).toHaveBeenCalledWith({
			error: "boom",
			message: "Failed to sync",
			metadata: undefined,
		});
	});
});
