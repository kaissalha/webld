import type * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

const badgeVariants = cva(
	"focus:outline-hidden max-w-fit rounded-full border text-xs font-semibold transition-colors",
	{
		variants: {
			variant: {
				default: "border-transparent bg-muted text-muted-foreground",
				secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
				destructive: "border-transparent bg-destructive/10 text-muted-foreground",
				warning: "border-transparent bg-warning/20 text-muted-foreground",
				success: "border-transparent bg-success/20 text-muted-foreground",
				optimal: "border-transparent bg-success/20 text-success-foreground",
				suboptimal: "border-transparent bg-warning/20 text-warning-foreground",
				critical: "border-transparent bg-destructive/10 text-destructive",
				outline: "text-muted-foreground",
				dark: "border-transparent bg-foreground/55 text-background",
			},
			size: {
				default: "px-2 py-px",
				sm: "px-2.5 py-1",
				lg: "px-3 py-1 text-sm",
				xl: "px-4 py-1.5 text-base",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	}
);

export type BadgeProps = {} & React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

const Badge = ({ className, variant, size, ...props }: BadgeProps) => {
	return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
};

export { Badge, badgeVariants };
