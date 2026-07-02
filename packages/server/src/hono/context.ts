export type WebldSession = {
	session: {
		activeOrganizationId?: string | null;
	};
	user: {
		id: string;
		name: string;
		email: string;
	};
} | null;

export type AuthenticatedWebldSession = NonNullable<WebldSession>;

export type CreateApiAppOptions = {
	getSession: (headers: Headers) => Promise<WebldSession>;
	handleAuth: (request: Request) => Promise<Response> | Response;
	scheduleAfter: (task: () => Promise<void>) => void;
	startIngestFile: (input: { fileId: string; organizationId: string; text?: string }) => Promise<{ runId: string }>;
	streamContext: {
		resumableStream: (streamId: string, createStream: () => ReadableStream) => Promise<ReadableStream | null>;
	};
};

export type ApiEnv = {
	Variables: {
		session: AuthenticatedWebldSession;
	};
};
