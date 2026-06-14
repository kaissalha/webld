import { logger } from "@starter/logger/server";

const GMAIL_MAILBOX_REQUEST_CONCURRENCY = 4;
const GMAIL_REQUEST_MAX_ATTEMPTS = 4;
const GMAIL_REQUEST_INITIAL_RETRY_DELAY_MS = 1_000;
const GMAIL_REQUEST_MAX_RETRY_DELAY_MS = 16_000;
const GMAIL_RETRYABLE_REASONS = new Set(["rateLimitExceeded", "userRateLimitExceeded"]);
const GMAIL_RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export const GMAIL_BATCH_MODIFY_MAX_MESSAGE_IDS = 1_000;

type GmailRequestLimiter = {
	activeCount: number;
	queue: Array<() => void>;
};

type GmailApiErrorResponseHeaders = {
	get?: (name: string) => string | null | undefined;
	[key: string]: unknown;
};

type GmailApiErrorLike = Error & {
	code?: number | string;
	errors?: Array<{
		message?: string;
		reason?: string;
	}>;
	response?: {
		headers?: GmailApiErrorResponseHeaders;
		status?: number;
	};
};

const gmailMailboxLimiters = new Map<string, GmailRequestLimiter>();

const sleep = async ({ durationMs }: { durationMs: number }) => {
	await new Promise<void>((resolve) => {
		setTimeout(resolve, durationMs);
	});
};

const getGmailMailboxLimiter = ({ mailboxKey }: { mailboxKey: string }) => {
	const existingLimiter = gmailMailboxLimiters.get(mailboxKey);

	if (existingLimiter) {
		return existingLimiter;
	}

	const limiter = {
		activeCount: 0,
		queue: [],
	} satisfies GmailRequestLimiter;

	gmailMailboxLimiters.set(mailboxKey, limiter);

	return limiter;
};

const runWithGmailMailboxLimit = async <T>({
	mailboxKey,
	operation,
}: {
	mailboxKey: string;
	operation: () => Promise<T>;
}) => {
	const limiter = getGmailMailboxLimiter({ mailboxKey });
	let hasReservedSlot = false;

	if (limiter.activeCount >= GMAIL_MAILBOX_REQUEST_CONCURRENCY) {
		await new Promise<void>((resolve) => {
			limiter.queue.push(() => {
				hasReservedSlot = true;
				resolve();
			});
		});
	}

	if (!hasReservedSlot) {
		limiter.activeCount += 1;
	}

	try {
		return await operation();
	} finally {
		const nextQueuedOperation = limiter.queue.shift();

		if (nextQueuedOperation) {
			nextQueuedOperation();
		} else {
			limiter.activeCount -= 1;
		}
	}
};

const getGmailApiError = ({ error }: { error: unknown }) => {
	if (error instanceof Error) {
		return error as GmailApiErrorLike;
	}

	return null;
};

const getGmailApiErrorStatus = ({ error }: { error: GmailApiErrorLike }) => {
	if (typeof error.response?.status === "number") {
		return error.response.status;
	}

	if (typeof error.code === "number") {
		return error.code;
	}

	if (typeof error.code === "string") {
		const status = Number.parseInt(error.code, 10);

		return Number.isNaN(status) ? null : status;
	}

	return null;
};

const getRetryAfterHeaderValue = ({ headers }: { headers?: GmailApiErrorResponseHeaders }) => {
	if (!headers) {
		return null;
	}

	const headerValueFromGetter = headers.get?.("retry-after") ?? headers.get?.("Retry-After");

	if (headerValueFromGetter) {
		return headerValueFromGetter;
	}

	const headerValue = headers["retry-after"] ?? headers["Retry-After"];

	if (Array.isArray(headerValue)) {
		return typeof headerValue[0] === "string" ? headerValue[0] : null;
	}

	return typeof headerValue === "string" ? headerValue : null;
};

const getRetryAfterDelayMs = ({ error }: { error: GmailApiErrorLike }) => {
	const retryAfter = getRetryAfterHeaderValue({ headers: error.response?.headers });

	if (!retryAfter) {
		return null;
	}

	const retryAfterSeconds = Number.parseInt(retryAfter, 10);

	if (!Number.isNaN(retryAfterSeconds)) {
		return Math.max(retryAfterSeconds * 1_000, GMAIL_REQUEST_INITIAL_RETRY_DELAY_MS);
	}

	const retryAfterDate = new Date(retryAfter);
	const retryAfterDelayMs = retryAfterDate.getTime() - Date.now();

	return Number.isNaN(retryAfterDate.getTime()) || retryAfterDelayMs <= 0 ? null : retryAfterDelayMs;
};

const isRetryableGmailApiError = ({ error }: { error: unknown }) => {
	const gmailError = getGmailApiError({ error });

	if (!gmailError) {
		return false;
	}

	const status = getGmailApiErrorStatus({ error: gmailError });
	const reasons = gmailError.errors?.map((errorDetails) => errorDetails.reason).filter(Boolean) ?? [];

	if (status && GMAIL_RETRYABLE_STATUS_CODES.has(status)) {
		return true;
	}

	if (status === 403 && reasons.some((reason) => GMAIL_RETRYABLE_REASONS.has(reason))) {
		return true;
	}

	const message = gmailError.message.toLowerCase();

	return message.includes("too many concurrent requests") || message.includes("rate limit exceeded");
};

const getGmailRetryDelayMs = ({ attempt, error }: { attempt: number; error: unknown }) => {
	const gmailError = getGmailApiError({ error });
	const retryAfterDelayMs = gmailError ? getRetryAfterDelayMs({ error: gmailError }) : null;

	if (retryAfterDelayMs) {
		return Math.min(retryAfterDelayMs, GMAIL_REQUEST_MAX_RETRY_DELAY_MS);
	}

	const exponentialDelayMs = GMAIL_REQUEST_INITIAL_RETRY_DELAY_MS * 2 ** Math.max(attempt - 1, 0);
	const jitterMs = Math.floor(Math.random() * 250);

	return Math.min(exponentialDelayMs + jitterMs, GMAIL_REQUEST_MAX_RETRY_DELAY_MS);
};

export const runGmailRequest = async <T>({
	mailboxKey,
	operation,
	operationName,
}: {
	mailboxKey: string;
	operation: () => Promise<T>;
	operationName: string;
}) => {
	for (let attempt = 1; attempt <= GMAIL_REQUEST_MAX_ATTEMPTS; attempt += 1) {
		try {
			return await runWithGmailMailboxLimit({
				mailboxKey,
				operation,
			});
		} catch (error) {
			if (attempt === GMAIL_REQUEST_MAX_ATTEMPTS || !isRetryableGmailApiError({ error })) {
				throw error;
			}

			const retryDelayMs = getGmailRetryDelayMs({ attempt, error });

			logger.warn({
				error,
				message: "Retrying Gmail API request after transient failure",
				metadata: {
					attempt,
					operationName,
					retryDelayMs,
				},
			});

			await sleep({ durationMs: retryDelayMs });
		}
	}

	throw new Error(`Gmail request ${operationName} failed without a retry result`);
};
