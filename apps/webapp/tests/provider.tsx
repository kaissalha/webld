import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from "nuqs/adapters/testing";

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

type ProviderProps = {
	children: React.ReactNode;
	searchParams?: Record<string, string>;
	onUrlUpdate?: OnUrlUpdateFunction;
};

export const Provider = ({ children, searchParams = {}, onUrlUpdate }: ProviderProps) => {
	return (
		<NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale='en'>{children}</NextIntlClientProvider>
			</QueryClientProvider>
		</NuqsTestingAdapter>
	);
};
