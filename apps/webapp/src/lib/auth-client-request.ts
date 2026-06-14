"use client";

type AuthClientError<TCode extends string = string> = {
	code?: TCode;
	message?: string;
} | null;

type AuthClientResult<TData = unknown, TCode extends string = string> = {
	data?: TData | null;
	error?: AuthClientError<TCode>;
};

const getAuthClientErrorMessage = ({ error, fallbackMessage }: { error: unknown; fallbackMessage: string }) => {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	return fallbackMessage;
};

export const resolveAuthClientResult = async <TData, TCode extends string = string>({
	request,
	fallbackMessage,
}: {
	request: () => Promise<AuthClientResult<TData, TCode> | null | undefined>;
	fallbackMessage: string;
}) => {
	try {
		const result = await request();

		if (result) {
			return result;
		}
	} catch (error) {
		return {
			error: {
				message: getAuthClientErrorMessage({
					error,
					fallbackMessage,
				}),
			},
		};
	}

	return {
		error: {
			message: fallbackMessage,
		},
	};
};

export const requireAuthClientData = async <TData, TCode extends string = string>({
	request,
	fallbackMessage,
}: {
	request: () => Promise<AuthClientResult<TData, TCode> | null | undefined>;
	fallbackMessage: string;
}) => {
	const result = await resolveAuthClientResult({
		request,
		fallbackMessage,
	});

	if (result.error) {
		throw new Error(result.error.message ?? fallbackMessage);
	}

	return result.data;
};
