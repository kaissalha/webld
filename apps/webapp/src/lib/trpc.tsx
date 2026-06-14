"use client";

import { environmentManager, type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createTRPCClient, httpBatchStreamLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import type { AppRouter } from "@starter/server";
import { getBaseURL } from "@starter/utils";

import { makeQueryClient, getQueryClient } from "./server/react-query";

let browserQueryClient: QueryClient | undefined;

const createQueryClient = () => {
	if (environmentManager.isServer()) return getQueryClient();

	if (!browserQueryClient) browserQueryClient = makeQueryClient();

	return browserQueryClient;
};

export const { TRPCProvider: TRPCProviderContext, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

export const trpcClient = createTRPCClient<AppRouter>({
	links: [httpBatchStreamLink({ methodOverride: "POST", url: `${getBaseURL()}api/trpc`, transformer: superjson })],
});

export const TRPCProvider = (
	props: Readonly<{
		children: React.ReactNode;
	}>
) => {
	const queryClient = createQueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			<TRPCProviderContext trpcClient={trpcClient} queryClient={queryClient}>
				{props.children}
				{(process.env.NEXT_PUBLIC_ENABLE_QUERY_DEVTOOLS === "1" ||
					process.env.NEXT_PUBLIC_ENABLE_QUERY_DEVTOOLS === "true") && (
					<ReactQueryDevtools initialIsOpen={false} />
				)}
			</TRPCProviderContext>
		</QueryClientProvider>
	);
};
