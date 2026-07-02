"use client";

import type { ReactNode } from "react";

import { environmentManager, type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { makeQueryClient, getQueryClient } from "./server/query-client";

let browserQueryClient: QueryClient | undefined;

const createQueryClient = () => {
	if (environmentManager.isServer()) return getQueryClient();

	if (!browserQueryClient) browserQueryClient = makeQueryClient();

	return browserQueryClient;
};

export const ApiProvider = (props: Readonly<{ children: ReactNode }>) => {
	const queryClient = createQueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			{props.children}
			{(process.env.NEXT_PUBLIC_ENABLE_QUERY_DEVTOOLS === "1" ||
				process.env.NEXT_PUBLIC_ENABLE_QUERY_DEVTOOLS === "true") && (
				<ReactQueryDevtools initialIsOpen={false} />
			)}
		</QueryClientProvider>
	);
};
