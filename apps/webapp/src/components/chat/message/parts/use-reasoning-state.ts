"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Coordinates the non-visual state for the reasoning part:
 * - debounces the thinking -> done transition so the label/loader doesn't flicker
 *   on token-by-token models,
 * - tracks how long the model spent thinking,
 * - auto-opens while thinking and keeps the final thought visible briefly before
 *   collapsing, while still honoring an explicit user toggle.
 */
export const useReasoningState = ({ isThinking }: { isThinking: boolean }) => {
	const [debouncedThinking, setDebouncedThinking] = useState(isThinking);
	const [autoOpen, setAutoOpen] = useState(isThinking);
	const [userToggled, setUserToggled] = useState<boolean | null>(null);
	const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
	const startedAtRef = useRef<number | null>(null);

	useEffect(() => {
		if (isThinking) {
			setDebouncedThinking(true);
			return;
		}

		const timeoutId = window.setTimeout(() => setDebouncedThinking(false), 150);
		return () => window.clearTimeout(timeoutId);
	}, [isThinking]);

	useEffect(() => {
		if (debouncedThinking) {
			startedAtRef.current ??= Date.now();
			return;
		}

		if (startedAtRef.current !== null && durationSeconds === null) {
			setDurationSeconds(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)));
		}
	}, [debouncedThinking, durationSeconds]);

	useEffect(() => {
		if (debouncedThinking) {
			setAutoOpen(true);
			return;
		}

		const timeoutId = window.setTimeout(() => setAutoOpen(false), 900);
		return () => window.clearTimeout(timeoutId);
	}, [debouncedThinking]);

	return {
		isThinking: debouncedThinking,
		open: userToggled ?? autoOpen,
		onOpenChange: setUserToggled,
		durationSeconds,
	};
};
