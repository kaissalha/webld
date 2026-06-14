"use client";

import * as React from "react";

import { useLogger } from "@starter/logger/client";

export const useCopyToClipboard = ({ timeout = 2000, onCopy }: { timeout?: number; onCopy?: () => void } = {}) => {
	const [isCopied, setIsCopied] = React.useState(false);
	const timeoutIdRef = React.useRef<number | null>(null);
	const logger = useLogger();

	const copyToClipboard = (value: string): void => {
		if (typeof window === "undefined" || !navigator.clipboard.writeText) {
			return;
		}

		if (!value) return;

		void (async () => {
			try {
				await navigator.clipboard.writeText(value);

				if (timeoutIdRef.current) {
					clearTimeout(timeoutIdRef.current);
				}
				setIsCopied(true);

				if (onCopy) {
					onCopy();
				}

				if (timeout !== 0) {
					timeoutIdRef.current = window.setTimeout(() => {
						setIsCopied(false);
						timeoutIdRef.current = null;
					}, timeout);
				}
			} catch (error) {
				logger.error({
					error,
					message: "Failed to copy text to clipboard",
				});
			}
		})();
	};

	// Cleanup timeout on unmount
	React.useEffect(() => {
		return (): void => {
			if (timeoutIdRef.current) {
				clearTimeout(timeoutIdRef.current);
			}
		};
	}, []);

	return { copyToClipboard, isCopied };
};
