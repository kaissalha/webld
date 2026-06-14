import { PostHogProvider } from "@posthog/next";

import "server-only";

export const BaseLayoutPostHogProvider = ({ children }: { children: React.ReactNode }) => {
	return (
		<PostHogProvider
			clientOptions={{
				api_host: "/ingest",
				capture_pageleave: true,
				capture_exceptions: true,
			}}
			serverOptions={{
				enableExceptionAutocapture: true,
			}}
		>
			{children}
		</PostHogProvider>
	);
};
