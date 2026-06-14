import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from "nuqs/adapters/testing";

import { type Flags, FlagsProvider } from "@/context/feature-flags";
import { TRPCProviderContext, trpcClient } from "@/lib/trpc";

// Create a client
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
			gcTime: 0,
			staleTime: 0,
		},
	},
});

// Default flag values for testing
export const defaultFlags: Flags = {
	testFlag: false,
};

type ProviderProps = {
	children: React.ReactNode;
	searchParams?: Record<string, string>;
	onUrlUpdate?: OnUrlUpdateFunction;
	flags?: Partial<Flags>;
};

export const Provider = ({ children, searchParams = {}, onUrlUpdate, flags = {} }: ProviderProps) => {
	const flagValues = { ...defaultFlags, ...flags };

	return (
		<NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
			<QueryClientProvider client={queryClient}>
				<TRPCProviderContext trpcClient={trpcClient} queryClient={queryClient}>
					<FlagsProvider values={flagValues}>
						<NextIntlClientProvider locale='en'>{children}</NextIntlClientProvider>
					</FlagsProvider>
				</TRPCProviderContext>
			</QueryClientProvider>
		</NuqsTestingAdapter>
	);
};
