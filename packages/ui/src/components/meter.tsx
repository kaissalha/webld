"use client";

import { Meter as MeterPrimitive } from "@base-ui/react/meter";

import { cn } from "@starter/ui/lib/utils";

const Meter = ({ className, children, ...props }: MeterPrimitive.Root.Props) => {
	return (
		<MeterPrimitive.Root className={cn("flex w-full flex-col gap-2", className)} {...props}>
			{children ? (
				children
			) : (
				<MeterTrack>
					<MeterIndicator />
				</MeterTrack>
			)}
		</MeterPrimitive.Root>
	);
};

const MeterLabel = ({ className, ...props }: MeterPrimitive.Label.Props) => {
	return <MeterPrimitive.Label data-slot='meter-label' className={cn("text-sm font-medium", className)} {...props} />;
};

const MeterTrack = ({ className, ...props }: MeterPrimitive.Track.Props) => {
	return (
		<MeterPrimitive.Track
			data-slot='meter-track'
			className={cn("block h-2 w-full overflow-hidden bg-input", className)}
			{...props}
		/>
	);
};

const MeterIndicator = ({ className, ...props }: MeterPrimitive.Indicator.Props) => {
	return (
		<MeterPrimitive.Indicator
			data-slot='meter-indicator'
			className={cn("bg-primary transition-all duration-500", className)}
			{...props}
		/>
	);
};

const MeterValue = ({ className, ...props }: MeterPrimitive.Value.Props) => {
	return (
		<MeterPrimitive.Value data-slot='meter-value' className={cn("text-sm tabular-nums", className)} {...props} />
	);
};

export { Meter, MeterLabel, MeterTrack, MeterIndicator, MeterValue };
