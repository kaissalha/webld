import { SeverityNumber, logs } from "@opentelemetry/api-logs";
import { getPostHog } from "@posthog/next";

import { buildExceptionProperties, buildLogAttributes, createLogger, restoreError } from "./shared";

const getSeverityNumber = ({ level }: { level: "debug" | "info" | "warn" | "error" }) => {
	switch (level) {
		case "debug":
			return SeverityNumber.DEBUG;
		case "info":
			return SeverityNumber.INFO;
		case "warn":
			return SeverityNumber.WARN;
		case "error":
			return SeverityNumber.ERROR;
	}
};

export const createServerLogger = () => {
	return createLogger({
		sendLog: async ({ level, message, metadata, error }) => {
			const posthog = await getPostHog();
			const context = posthog.getContext();

			logs.getLogger("@starter/logger").emit({
				body: message,
				severityNumber: getSeverityNumber({ level }),
				severityText: level.toUpperCase(),
				attributes: buildLogAttributes({
					level,
					metadata,
					error,
					distinctId: context?.distinctId,
					sessionId: context?.sessionId,
				}),
			});
		},
		sendException: async ({ error, message, metadata }) => {
			const posthog = await getPostHog();

			// @ts-expect-error - captureException is not typed
			posthog.captureException(
				restoreError({
					error,
					fallbackMessage: message,
				}),
				undefined,
				buildExceptionProperties({
					message,
					metadata,
				})
			);
		},
	});
};

export const logger = createServerLogger();
