"use client";

import { useEffect, useRef, useState } from "react";

export type ReasoningState = "streaming" | "done";

/**
 * Coordinates the non-visual state for the reasoning part: whether the panel is
 * open (auto-open while thinking, auto-collapse when done, but honor an explicit
 * user toggle) and how long the model spent thinking.
 */
export const useReasoningState = ({ isThinking }: { isThinking: boolean }) => {
	const [userToggled, setUserToggled] = useState<boolean | null>(null);
	const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
	const startedAtRef = useRef<number | null>(null);

	useEffect(() => {
		if (isThinking) {
			startedAtRef.current ??= Date.now();
			return;
		}

		if (startedAtRef.current !== null && durationSeconds === null) {
			setDurationSeconds(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)));
		}
	}, [isThinking, durationSeconds]);

	return {
		open: userToggled ?? isThinking,
		onOpenChange: setUserToggled,
		durationSeconds,
	};
};
