"use client";

import { memo, useEffect, useRef } from "react";

import { usePostHog } from "@posthog/next";

import { authClient } from "@/lib/auth-client";

const RESIZE_OBSERVER_WARNING = "ResizeObserver loop completed with undelivered notifications.";

export const PostHogClientEffects = memo(() => {
	const posthog = usePostHog();
	const { data: sessionData } = authClient.useSession();
	const identifiedUserIdRef = useRef<string | null>(null);

	useEffect(() => {
		if (!posthog) {
			return;
		}

		posthog.set_config({
			before_send: (event) => {
				if (!event || event.event !== "$exception") {
					return event;
				}

				const exceptionList = event.properties.$exception_list;
				const exception = Array.isArray(exceptionList) ? exceptionList[0] : null;
				const exceptionValue =
					exception && typeof exception === "object" && "value" in exception ? exception.value : null;

				if (exceptionValue === RESIZE_OBSERVER_WARNING) {
					return null;
				}

				return event;
			},
		});
	}, [posthog]);

	useEffect(() => {
		if (!posthog) {
			return;
		}

		const user = sessionData?.user;

		if (!user) {
			if (identifiedUserIdRef.current) {
				posthog.reset();
				identifiedUserIdRef.current = null;
			}

			return;
		}

		if (identifiedUserIdRef.current === user.id) {
			return;
		}

		const { id, ...rest } = user;

		posthog.identify(id, rest);
		identifiedUserIdRef.current = id;
	}, [posthog, sessionData?.user]);

	return null;
});

PostHogClientEffects.displayName = "PostHogClientEffects";
