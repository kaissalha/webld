"server-only";

import { headers } from "next/headers";

import type { Adapter, Identify } from "flags";
import { dedupe } from "flags/next";
import { PostHog } from "posthog-node";
import { v7 as uuidv7 } from "uuid";

import type { Request } from "@/instrumentation";
import { logger } from "@starter/logger/server";

const posthogApiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (!posthogApiKey) {
	throw new Error("NEXT_PUBLIC_POSTHOG_KEY is not set");
}

export const getPostHogServer = () => {
	return new PostHog(posthogApiKey, {
		host: "https://us.i.posthog.com",
		flushAt: 1,
		flushInterval: 0,
	});
};

/**
 * Get the PostHog distinct ID from the request headers.
 *
 * This is used to identify the user in PostHog.
 */
export const getPostHogDistinctIdFromHeaders = async (request?: Request) => {
	const headersList = request ? request.headers : await headers();

	let distinctId = uuidv7();
	let posthogSessionId: string | undefined;

	const cookieString = headersList instanceof Headers ? headersList.get("cookie") : headersList.cookie;

	if (!cookieString) return { distinctId, posthogSessionId };

	const postHogCookieMatch = cookieString?.match(/ph_phc_.*?_posthog=([^;]+)/);

	const posthogSessionIdMatch = cookieString?.match(/X-POSTHOG-SESSION-ID=([^;]+)/);

	if (!postHogCookieMatch?.[1]) return { distinctId, posthogSessionId };

	try {
		const decodedCookie = decodeURIComponent(postHogCookieMatch[1]);
		const postHogData = JSON.parse(decodedCookie) as { distinct_id: string };
		distinctId = postHogData.distinct_id;

		if (posthogSessionIdMatch?.[1]) {
			posthogSessionId = posthogSessionIdMatch[1];
		}
	} catch (error) {
		logger.error({
			error,
			message: "Error parsing distinct ID from PostHog cookie",
		});
	}

	return {
		distinctId,
		posthogSessionId,
	};
};

/**
 * Fetches all feature flags for the current user from PostHog.
 * This is deduplicated per-request to avoid multiple API calls.
 */
export const getAllPostHogFlags = dedupe(async () => {
	const { distinctId } = await getPostHogDistinctIdFromHeaders();
	const posthogClient = getPostHogServer();
	const { featureFlags, featureFlagPayloads } = await posthogClient.getAllFlagsAndPayloads(distinctId);

	return {
		distinctId,
		flags: featureFlags ?? {},
		payloads: featureFlagPayloads,
	};
});

export const getBootstrapData = async () => {
	const { distinctId, flags } = await getAllPostHogFlags();

	const bootstrap = {
		distinctID: distinctId,
		featureFlags: flags,
	};

	return bootstrap;
};

/**
 * Creates a custom adapter that reads from pre-fetched PostHog flags.
 * This avoids making additional API calls for each flag evaluation.
 */
export const createPreFetchedPostHogAdapter = () => {
	return {
		/**
		 * Returns whether a feature flag is enabled (boolean).
		 */
		isFeatureEnabled: <ValueType = boolean>(): Adapter<ValueType, PostHogEntities> => ({
			async decide({ key }) {
				const { flags } = await getAllPostHogFlags();
				const value = flags[key];
				return (value === true ||
					value === "true" ||
					(typeof value === "string" && value !== "false")) as ValueType;
			},
		}),

		/**
		 * Returns the feature flag value (boolean or string for multivariate flags).
		 */
		featureFlagValue: <ValueType = boolean | string>(): Adapter<ValueType, PostHogEntities> => ({
			async decide({ key }) {
				const { flags } = await getAllPostHogFlags();
				return flags[key] as ValueType;
			},
		}),

		/**
		 * Returns the feature flag payload, mapped through a getter function.
		 */
		featureFlagPayload: <ValueType>(
			getter: (payload: unknown) => ValueType
		): Adapter<ValueType, PostHogEntities> => ({
			async decide({ key }) {
				const { payloads } = await getAllPostHogFlags();
				const payload = payloads?.[key];
				return getter(payload);
			},
		}),
	};
};

/**
 * Pre-fetched PostHog adapter that uses getAllFlags to batch flag evaluations.
 * Use this instead of postHogAdapter to avoid multiple API calls.
 */
export const preFetchedPostHogAdapter = createPreFetchedPostHogAdapter();

export type PostHogEntities = {
	distinctId: string;
	posthogSessionId?: string;
};

export const identify = dedupe(async () => {
	return await getPostHogDistinctIdFromHeaders();
}) satisfies Identify<PostHogEntities>;
