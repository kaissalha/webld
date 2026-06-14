"use client";

import { useEffect } from "react";

import { parseAsString, useQueryState } from "nuqs";

import { useLogger } from "@webld/logger/client";
import { toast } from "@webld/ui/components/sonner";

export const ErrorToaster = () => {
	const [error, setError] = useQueryState("error", parseAsString);
	const logger = useLogger();

	useEffect(() => {
		let timeoutId: NodeJS.Timeout | null = null;

		if (error) {
			logger.info({
				message: "Showing URL error toast",
				metadata: {
					error,
				},
			});
			timeoutId = setTimeout(() => {
				toast.error(error);
				setError(null);
			}, 1500);
		}

		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	}, [error, logger, setError]);

	return null;
};
