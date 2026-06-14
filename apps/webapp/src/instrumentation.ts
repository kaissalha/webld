import { logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { LoggerProvider, SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";

export type Request = {
	path: string; // resource path, e.g. /blog?name=foo
	method: string; // request method. e.g. GET, POST, etc
	headers: { [key: string]: string };
};

const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

const posthogProjectToken = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export const loggerProvider = posthogProjectToken
	? new LoggerProvider({
			resource: resourceFromAttributes({
				"service.name": "webapp",
				"deployment.environment": process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
			}),
			processors: [
				new SimpleLogRecordProcessor(
					new OTLPLogExporter({
						url: new URL("/i/v1/logs", posthogHost).toString(),
						headers: {
							Authorization: `Bearer ${posthogProjectToken}`,
							"Content-Type": "application/json",
						},
					})
				),
			],
		})
	: null;

export const register = () => {
	if (process.env.NEXT_RUNTIME === "nodejs" && loggerProvider) {
		logs.setGlobalLoggerProvider(loggerProvider);
	}
};

export const onRequestError = async (err: Error, request: Request) => {
	if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PUBLIC_CAPTURE_ERRORS) {
		const { getPostHogDistinctIdFromHeaders, getPostHogServer } = await import("./lib/server/posthog");
		const posthog = getPostHogServer();
		const { distinctId, posthogSessionId } = await getPostHogDistinctIdFromHeaders(request);
		posthog.captureException(err, distinctId, {
			$session_id: posthogSessionId,
		});
	}
};
