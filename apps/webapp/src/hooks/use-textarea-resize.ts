"use client";

import type { ComponentProps } from "react";
import { useLayoutEffect, useRef, useState } from "react";

export const useTextareaResize = (value: ComponentProps<"textarea">["value"], rows = 1) => {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [currentRows, setCurrentRows] = useState(rows);

	useLayoutEffect(() => {
		const textArea = textareaRef.current;

		if (textArea) {
			// Get the line height to calculate minimum height based on rows
			const computedStyle = window.getComputedStyle(textArea);
			const lineHeight = Number.parseInt(computedStyle.lineHeight, 10) || 20;
			const padding =
				Number.parseInt(computedStyle.paddingTop, 10) + Number.parseInt(computedStyle.paddingBottom, 10);

			// Calculate minimum height based on rows
			const minHeight = lineHeight * rows + padding;

			// Reset height to auto first to get the correct scrollHeight
			textArea.style.height = "0px";
			const scrollHeight = Math.max(textArea.scrollHeight, minHeight);

			// Set the final height
			const finalHeight = scrollHeight + 2;
			textArea.style.height = `${finalHeight}px`;

			// Calculate the current number of rows based on the scroll height (actual content height)
			const calculatedRows = Math.max(rows, Math.ceil((scrollHeight - padding) / lineHeight));
			setCurrentRows(calculatedRows);
		}
	}, [textareaRef, value, rows]);

	return { textareaRef, currentRows };
};
