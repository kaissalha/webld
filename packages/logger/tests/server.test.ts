import { beforeEach, describe, expect, it, vi } from "vitest";

const emitMock = vi.fn();
const captureExceptionMock = vi.fn();
const getPostHogMock = vi.fn(async () => ({
	captureException: captureExceptionMock,
	getContext: () => ({
		distinctId: "distinct-1",
		sessionId: "session-1",
	}),
}));

vi.mock("@opentelemetry/api-logs", () => {
	return {
		SeverityNumber: {
			DEBUG: 5,
			ERROR: 17,
			INFO: 9,
			WARN: 13,
		},
		logs: {
			getLogger: vi.fn(() => ({
				emit: emitMock,
			})),
		},
	};
});

vi.mock("@posthog/next", () => {
	return {
		getPostHog: getPostHogMock,
	};
});

describe("server logger", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("emits OpenTelemetry logs with PostHog context attributes", async () => {
		const { createServerLogger } = await import("../src/server");
		const logger = createServerLogger();

		await logger.info({
			message: "Email sent",
			metadata: {
				messageId: "msg-1",
			},
		});

		expect(emitMock).toHaveBeenCalledWith({
			attributes: {
				level: "info",
				messageId: "msg-1",
				posthogDistinctId: "distinct-1",
				sessionId: "session-1",
			},
			body: "Email sent",
			severityNumber: 9,
			severityText: "INFO",
		});
		expect(captureExceptionMock).not.toHaveBeenCalled();
	});

	it("captures exceptions with restored errors and serialized metadata", async () => {
		const { createServerLogger } = await import("../src/server");
		const logger = createServerLogger();

		await logger.error({
			error: {
				message: "Gateway unavailable",
				name: "GatewayError",
			},
			message: "Failed to send email",
			metadata: {
				retry: 2,
			},
		});

		expect(emitMock).toHaveBeenCalledWith({
			attributes: {
				errorMessage: "Gateway unavailable",
				errorName: "GatewayError",
				level: "error",
				posthogDistinctId: "distinct-1",
				retry: 2,
				sessionId: "session-1",
			},
			body: "Failed to send email",
			severityNumber: 17,
			severityText: "ERROR",
		});
		expect(captureExceptionMock).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Gateway unavailable",
				name: "GatewayError",
			}),
			undefined,
			{
				message: "Failed to send email",
				retry: 2,
			}
		);
	});
});
