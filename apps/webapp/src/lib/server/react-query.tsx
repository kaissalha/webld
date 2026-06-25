import { cache } from "react";

import {
	defaultShouldDehydrateQuery,
	dehydrate,
	environmentManager,
	HydrationBoundary,
	QueryClient,
} from "@tanstack/react-query";
import type { ResolverDef, TRPCQueryOptions } from "@trpc/tanstack-react-query";
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

type TRPCPrefetchQueryOptions = ReturnType<TRPCQueryOptions<ResolverDef>>;

export const prefetch = <T extends TRPCPrefetchQueryOptions>(queryOptions: T) => {
	const queryClient = getQueryClient();
	if (queryOptions.queryKey[1]?.type === "infinite") {
		return queryClient.prefetchInfiniteQuery(queryOptions as Parameters<QueryClient["prefetchInfiniteQuery"]>[0]);
	}

	return queryClient.prefetchQuery(queryOptions);
};

export const HydrateClient = (props: { children: React.ReactNode }) => {
	const queryClient = getQueryClient();
	return <HydrationBoundary state={dehydrate(queryClient)}>{props.children}</HydrationBoundary>;
};
