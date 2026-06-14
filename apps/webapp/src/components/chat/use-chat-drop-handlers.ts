"use client";

import { useCallback } from "react";

type UseChatDropHandlersOptions = {
	disabled?: boolean;
	onFiles: (files: File[]) => void;
};

export const useChatDropHandlers = ({ disabled = false, onFiles }: UseChatDropHandlersOptions) => {
	const handleDragOver = useCallback(
		(event: React.DragEvent<HTMLElement>) => {
			if (disabled) {
				return;
			}

			if (Array.from(event.dataTransfer.items).some((item) => item.kind === "file")) {
				event.preventDefault();
			}
		},
		[disabled]
	);

	const handleDrop = useCallback(
		(event: React.DragEvent<HTMLElement>) => {
			if (disabled) {
				return;
			}

			const files = Array.from(event.dataTransfer.files);

			if (files.length === 0) {
				return;
			}

			event.preventDefault();
			onFiles(files);
		},
		[disabled, onFiles]
	);

	return { handleDragOver, handleDrop };
};
