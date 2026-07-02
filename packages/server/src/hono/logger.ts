import type { LogLevel, LogMetadata } from "@webld/logger";

type ServerLogInput = {
	level: LogLevel;
	message: string;
	metadata?: LogMetadata;
	error?: unknown;
};

export const logServerEvent = async ({ level, message, metadata, error }: ServerLogInput) => {
	const { logger } = await import("@webld/logger/server");

	if (level === "error") {
		logger.error({
			error,
			message,
			metadata,
		});
		return;
	}

	logger.log({
		level,
		message,
		metadata,
		error,
	});
};
