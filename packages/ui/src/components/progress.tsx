"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { cn } from "@webld/ui/lib/utils";

const Progress = ({ className, children, ...props }: ProgressPrimitive.Root.Props) => {
	return (
		<ProgressPrimitive.Root className={cn("flex w-full flex-col gap-2", className)} {...props}>
			{children ? (
				children
			) : (
				<ProgressTrack>
					<ProgressIndicator />
				</ProgressTrack>
			)}
		</ProgressPrimitive.Root>
	);
};

const ProgressTrack = ({ className, ...props }: ProgressPrimitive.Track.Props) => {
	return (
		<ProgressPrimitive.Track
			data-slot='progress-track'
			className={cn("block h-2 w-full overflow-hidden rounded-full bg-input", className)}
			{...props}
		/>
	);
};

const ProgressIndicator = ({ className, ...props }: ProgressPrimitive.Indicator.Props) => {
	return (
		<ProgressPrimitive.Indicator
			data-slot='progress-indicator'
			className={cn("h-full w-(--progress-value) bg-primary transition-all duration-500", className)}
			{...props}
		/>
	);
};

const ProgressLabel = ({ className, ...props }: ProgressPrimitive.Label.Props) => {
	return (
		<ProgressPrimitive.Label
			data-slot='progress-label'
			className={cn("text-sm font-medium", className)}
			{...props}
		/>
	);
};

const ProgressValue = ({ className, ...props }: ProgressPrimitive.Value.Props) => {
	return (
		<ProgressPrimitive.Value
			data-slot='progress-value'
			className={cn("text-sm tabular-nums", className)}
			{...props}
		/>
	);
};

export { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue };
