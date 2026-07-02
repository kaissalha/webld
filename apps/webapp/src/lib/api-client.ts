import { queryOptions } from "@tanstack/react-query";
import { hc } from "hono/client";

import { type LinkPreviewResponse } from "@webld/server/api-schemas";
import type { AppType } from "@webld/server/hono";
import { url } from "@webld/utils";

// Type calculation happens once here instead of on every hc call site,
// keeping IDE type instantiation cheap as the API grows.
export type ApiClient = ReturnType<typeof hc<AppType>>;

export const apiClient: ApiClient = hc<AppType>(url.getBaseURL().origin, {
	fetch: (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
		globalThis.fetch(input, {
			...init,
			credentials: "include",
		}),
});

export const linkPreviewQueryOptions = ({ url, enabled }: { url: string; enabled: boolean }) =>
	queryOptions<LinkPreviewResponse>({
		queryKey: ["link-preview", url],
		queryFn: async () => {
			const response = await apiClient.api["link-previews"].$get({
				query: { url },
			});

			if (!response.ok) {
				throw new Error("Failed to fetch link preview metadata.");
			}

			const payload = await response.json();
			return payload;
		},
		staleTime: 20 * 60 * 1000,
		enabled,
	});
