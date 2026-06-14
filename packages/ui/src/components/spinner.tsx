import type { ComponentProps } from "react";

import { Loader2Icon } from "lucide-react";

import { cn } from "@starter/ui/lib/utils";

const Spinner = ({ className, ...props }: ComponentProps<typeof Loader2Icon>) => {
	return (
		<Loader2Icon aria-label='Loading' className={cn("size-4 animate-spin", className)} role='status' {...props} />
	);
};

export { Spinner };
