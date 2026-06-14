"use client";

import { Children, cloneElement, isValidElement, memo, useCallback, useLayoutEffect, useRef } from "react";

import { cn } from "@webld/ui/lib/utils";

type MasonryProps = {
	children: React.ReactNode;
	/** Minimum column width in pixels. Default: 320 */
	minColumnWidth?: number;
	/** Gap between items in pixels. Default: 16 */
	gap?: number;
	/** Additional class names */
	className?: string;
};

const Masonry = memo(({ children, minColumnWidth = 320, gap = 16, className }: MasonryProps) => {
	const containerRef = useRef<HTMLDivElement | null>(null);

	const resizeItems = useCallback(() => {
		const container = containerRef.current;
		if (!container) return;

		const styles = window.getComputedStyle(container);
		const rowGap = Number.parseFloat(styles.rowGap) || 0;
		const rowHeight = Number.parseFloat(styles.gridAutoRows) || 1;
		const rowSpan = rowHeight + rowGap;
		const items = container.querySelectorAll<HTMLElement>("[data-masonry-item]");

		items.forEach((item) => {
			const height = item.getBoundingClientRect().height;
			const span = Math.ceil((height + rowGap) / rowSpan);
			item.style.gridRowEnd = `span ${span}`;
		});
	}, []);

	useLayoutEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const childCount = Children.count(children);
		if (childCount === 0) return;

		const observer = new ResizeObserver(() => {
			window.requestAnimationFrame(resizeItems);
		});

		observer.observe(container);
		container.querySelectorAll<HTMLElement>("[data-masonry-item]").forEach((item) => {
			observer.observe(item);
		});
		resizeItems();

		return () => observer.disconnect();
	}, [resizeItems, children]);

	return (
		<div
			ref={containerRef}
			className={cn("grid items-start min-w-0", className)}
			style={{
				gridTemplateColumns: `repeat(auto-fit, minmax(min(${minColumnWidth}px, 100%), 1fr))`,
				gridAutoRows: "8px",
				gap: `${gap}px`,
			}}
		>
			{Children.map(children, (child) => {
				if (isValidElement<{ "data-masonry-item"?: boolean }>(child)) {
					return cloneElement(child, {
						"data-masonry-item": true,
					});
				}
				return child;
			})}
		</div>
	);
});

Masonry.displayName = "Masonry";

export { Masonry };
