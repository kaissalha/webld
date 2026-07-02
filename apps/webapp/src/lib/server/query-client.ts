import { cache } from "react";

import {
	defaultShouldDehydrateQuery,
	environmentManager,
	QueryClient,
	type QueryClient as QueryClientType,
} from "@tanstack/react-query";
import superjson from "superjson";

export const makeQueryClient = () => {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: environmentManager.isServer() ? "static" : 60 * 1000,
				gcTime: 60 * 1000,
			},
			dehydrate: {
				serializeData: superjson.serialize,
				shouldDehydrateQuery: (query) => defaultShouldDehydrateQuery(query) || query.state.status === "pending",
				shouldRedactErrors: (_error) => {
					// We should not catch Next.js server errors
					// as that's how Next.js detects dynamic pages
					// so we cannot redact them.
					// Next.js also automatically redacts errors for us
					// with better digests.
					return false;
				},
			},
			hydrate: {
				deserializeData: superjson.deserialize,
			},
		},
	});
};

export const getQueryClient = cache(makeQueryClient);

export const prefetch = (queryOptions: Parameters<QueryClientType["prefetchQuery"]>[0]) => {
	const queryClient = getQueryClient();
	return queryClient.prefetchQuery(queryOptions);
};
