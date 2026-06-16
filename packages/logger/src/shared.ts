export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogMetadata = Record<string, unknown>;

export type LogOptions = {
	message: string;
	metadata?: LogMetadata;
	error?: unknown;
};

export type LogPayload = LogOptions & {
	level: LogLevel;
};

export type Logger = {
	log: (options: LogPayload) => void;
	debug: (options: LogOptions) => void;
	info: (options: LogOptions) => void;
	warn: (options: LogOptions) => void;
	error: (options: LogOptions) => void;
};

export type CreateLoggerOptions = {
	sendLog: (options: LogPayload) => void;
	sendException: (options: { error: unknown; message: string; metadata?: LogMetadata }) => void;
};

type LogAttributeValue = boolean | number | string | boolean[] | number[] | string[];

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	if (!value || typeof value !== "object") {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
};

const isLogAttributePrimitive = (value: unknown): value is boolean | number | string => {
	return typeof value === "boolean" || typeof value === "number" || typeof value === "string";
};

const isLogAttributeArray = (value: unknown): value is boolean[] | number[] | string[] => {
	if (!Array.isArray(value) || value.length === 0) {
		return false;
	}

	if (!value.every((entry) => isLogAttributePrimitive(entry))) {
		return false;
	}

	return value.every((entry) => typeof entry === typeof value[0]);
};

const toLogAttributeValue = (value: unknown): LogAttributeValue | undefined => {
	if (value === null || value === undefined) {
		return undefined;
	}

	if (isLogAttributePrimitive(value) || isLogAttributeArray(value)) {
		return value;
	}

	return JSON.stringify(serializeValue(value));
};

export const serializeError = (error: unknown) => {
	if (!(error instanceof Error)) {
		return serializeValue(error);
	}

	return {
		name: error.name,
		message: error.message,
		stack: error.stack,
		cause: serializeValue(error.cause),
	};
};

export const serializeValue = (value: unknown): unknown => {
	if (value instanceof Error) {
		return serializeError(value);
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (Array.isArray(value)) {
		return value.map((item) => serializeValue(item));
	}

	if (typeof value === "bigint") {
		return value.toString();
	}

	if (typeof value === "function") {
		return value.name ? `[Function ${value.name}]` : "[Function anonymous]";
	}

	if (typeof value === "symbol") {
		return value.toString();
	}

	if (isPlainObject(value)) {
		const serializedEntries = Object.entries(value).map(([key, entry]): [string, unknown] => [
			key,
			serializeValue(entry),
		]);

		return Object.fromEntries(serializedEntries);
	}

	return value;
};

const serializeMetadata = (metadata?: LogMetadata) => {
	if (!metadata) {
		return {};
	}

	return Object.fromEntries(
		Object.entries(metadata).map(([key, value]): [string, unknown] => [key, serializeValue(value)])
	);
};

const buildErrorAttributes = ({ error }: { error?: unknown }) => {
	if (error === undefined) {
		return {};
	}

	const serializedError = serializeError(error);

	if (!isPlainObject(serializedError)) {
		return {
			error: JSON.stringify(serializedError),
		};
	}

	return {
		...(typeof serializedError.name === "string" ? { errorName: serializedError.name } : {}),
		...(typeof serializedError.message === "string" ? { errorMessage: serializedError.message } : {}),
		...(typeof serializedError.stack === "string" ? { errorStack: serializedError.stack } : {}),
		...(serializedError.cause !== undefined ? { errorCause: JSON.stringify(serializedError.cause) } : {}),
	};
};

export const buildLogAttributes = ({
	level,
	metadata,
	error,
	distinctId,
	sessionId,
}: {
	level: LogLevel;
	metadata?: LogMetadata;
	error?: unknown;
	distinctId?: string;
	sessionId?: string;
}) => {
	const serializedMetadata = serializeMetadata(metadata);
	const metadataAttributes = Object.fromEntries(
		Object.entries(serializedMetadata).flatMap(([key, value]) => {
			const attributeValue = toLogAttributeValue(value);

			if (attributeValue === undefined) {
				return [];
			}

			return [[key, attributeValue]];
		})
	);

	return {
		...metadataAttributes,
		...buildErrorAttributes({ error }),
		level,
		...(distinctId ? { posthogDistinctId: distinctId } : {}),
		...(sessionId ? { sessionId } : {}),
	};
};

export const buildExceptionProperties = ({ message, metadata }: { message?: string; metadata?: LogMetadata }) => {
	return {
		...serializeMetadata(metadata),
		...(message ? { message } : {}),
	};
};

export const restoreError = ({ error, fallbackMessage }: { error: unknown; fallbackMessage: string }) => {
	if (error instanceof Error) {
		return error;
	}

	if (typeof error === "string" && error) {
		return new Error(error);
	}

	if (isPlainObject(error)) {
		const restoredError = new Error(
			typeof error.message === "string" && error.message ? error.message : fallbackMessage
		);

		if (typeof error.name === "string" && error.name) {
			restoredError.name = error.name;
		}

		if (typeof error.stack === "string" && error.stack) {
			restoredError.stack = error.stack;
		}

		return restoredError;
	}

	return new Error(fallbackMessage);
};

const getConsoleMethod = ({ level }: { level: LogLevel }) => {
	switch (level) {
		case "debug":
			return console.debug;
		case "info":
			return console.info;
		case "warn":
			return console.warn;
		case "error":
			return console.error;
	}
};

export const writeToConsole = ({
	level,
	message,
	metadata,
	error,
}: {
	level: LogLevel;
	message: string;
	metadata?: LogMetadata;
	error?: unknown;
}) => {
	const consoleMethod = getConsoleMethod({ level });
	const formattedMessage = message;

	if (metadata && error !== undefined) {
		consoleMethod(formattedMessage, metadata, error);
		return;
	}

	if (metadata) {
		consoleMethod(formattedMessage, metadata);
		return;
	}

	if (error !== undefined) {
		consoleMethod(formattedMessage, error);
		return;
	}

	consoleMethod(formattedMessage);
};

export const createLogger = ({ sendLog, sendException }: CreateLoggerOptions): Logger => {
	const log = ({ level, message, metadata, error }: LogPayload) => {
		if (process.env.NODE_ENV === "development") {
			writeToConsole({
				level,
				message,
				metadata,
				error,
			});
		}

		sendLog({
			level,
			message,
			metadata,
			error,
		});

		if (level !== "error") {
			return;
		}

		sendException({
			error: error ?? new Error(message),
			message,
			metadata,
		});
	};

	return {
		log,
		debug: (options) =>
			log({
				...options,
				level: "debug",
			}),
		info: (options) =>
			log({
				...options,
				level: "info",
			}),
		warn: (options) =>
			log({
				...options,
				level: "warn",
			}),
		error: (options) =>
			log({
				...options,
				level: "error",
			}),
	};
};
