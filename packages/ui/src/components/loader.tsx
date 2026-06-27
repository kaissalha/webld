import type { ComponentProps } from "react";

import { cn } from "@webld/ui/lib/utils";

const BAR_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

/**
 * Animated loading icon: a comet-trail spinner where each bar fades around the
 * circle. The wrapper is rotated (not the SVG) so the animation stays on the GPU.
 */
export const Loader = ({ size = 16, className, ...props }: ComponentProps<"span"> & { size?: number }) => {
	return (
		<span
			role='status'
			aria-label='Loading'
			className={cn("inline-flex shrink-0 animate-spin text-current", className)}
			style={{ blockSize: size, inlineSize: size }}
			{...props}
		>
			<svg viewBox='0 0 24 24' fill='none' className='size-full'>
				{BAR_ANGLES.map((angle, index) => (
					<rect
						key={angle}
						x='11'
						y='2'
						width='2'
						height='6'
						rx='1'
						fill='currentColor'
						opacity={(index + 1) / BAR_ANGLES.length}
						transform={`rotate(${angle} 12 12)`}
					/>
				))}
			</svg>
		</span>
	);
};

Loader.displayName = "Loader";
