import { z } from "zod";

import { extractUrlMetadata } from "../../lib/get-url-metadata";
import type { WebldRouterFactoryOptions } from "../shared";

export const createChatRouter = ({ createTRPCRouter, protectedProcedure }: WebldRouterFactoryOptions) =>
	createTRPCRouter({
		getUrlMetadata: protectedProcedure
			.input(
				z.object({
					url: z.string().url(),
				})
			)
			.query(async ({ input }) => {
				const cleanUrl = input.url;
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 10_000);

				try {
					const response = await fetch(cleanUrl, {
						headers: {
							"User-Agent": "Mozilla/5.0 (compatible; LinkPreview/1.0)",
						},
						signal: controller.signal,
					});

					clearTimeout(timeoutId);

					if (!response.ok) {
						return null;
					}

					const html = await response.text();
					return extractUrlMetadata(html, cleanUrl);
				} catch {
					clearTimeout(timeoutId);
					return null;
				}
			}),
	});
