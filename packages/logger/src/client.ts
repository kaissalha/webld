"use client";

import { createLogger, serializeError, serializeValue } from "./shared";

const postClientLog = ({
	level,
	message,
	metadata,
	error,
}: {
	level: "debug" | "info" | "warn" | "error";
	message: string;
	metadata?: Record<string, unknown>;
	error?: unknown;
}) => {
	void fetch("/api/logs", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			level,
			message,
			...(metadata ? { metadata: serializeValue(metadata) } : {}),
			...(error !== undefined ? { error: serializeError(error) } : {}),
		}),
		keepalive: true,
	}).catch(() => {});
};

export const createClientLogger = () => {
	return createLogger({
		sendLog: ({ level, message, metadata, error }) => {
			postClientLog({
				level,
				message,
				metadata,
				error,
			});
		},
		sendException: () => {},
	});
};

export const useLogger = createClientLogger;
