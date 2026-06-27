import type { ComponentProps } from "react";

import { cn } from "@webld/ui/lib/utils";

/**
 * Animated shimmer text built on the `shimmer` utility (tw-shimmer).
 *
 * The shimmer base color is `currentColor`, so set a text color on the element
 * (e.g. `text-muted-foreground`) and the brighter highlight sweep is derived
 * from it automatically. Pure CSS, so it keeps animating smoothly even while
 * the main thread is busy streaming tokens.
 */
export const TextShimmer = ({ className, ...props }: ComponentProps<"span">) => {
	return <span className={cn("shimmer", className)} {...props} />;
};

TextShimmer.displayName = "TextShimmer";
