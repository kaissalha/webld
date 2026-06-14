"use client";

import { useId } from "react";

const ShimmerLogoLoader = ({
	size,
	baseColor,
	highlightColor,
}: {
	size: number;
	baseColor: string;
	highlightColor: string;
}) => {
	const shimmerGradientId = `shimmerGradient-${useId()}`;

	return (
		<svg
			width={size}
			height={size}
			viewBox='0 15 100 100'
			xmlns='http://www.w3.org/2000/svg'
			className='overflow-hidden'
		>
			<defs>
				<linearGradient
					id={shimmerGradientId}
					x1='0%'
					y1='0%'
					x2='100%'
					y2='27%'
					gradientUnits='objectBoundingBox'
				>
					<stop offset='0%' stopColor={baseColor} />
					<stop offset='10%' stopColor={baseColor} />
					<stop offset='40%' stopColor={highlightColor} />
					<stop offset='60%' stopColor={highlightColor} />
					<stop offset='90%' stopColor={baseColor} />
					<stop offset='100%' stopColor={baseColor} />
					<animateTransform
						attributeName='gradientTransform'
						type='translate'
						values='-1 -0.24; 1 0.24; 1 0.24'
						dur='1.3s'
						repeatCount='indefinite'
						keyTimes='0; 0.8; 1'
						calcMode='linear'
					/>
				</linearGradient>
			</defs>
			<polygon points='50,50 65,65 50,80 35,65' fill={`url(#${shimmerGradientId})`} />
			<line x1='50' y1='17' x2='50' y2='56' stroke={`url(#${shimmerGradientId})`} strokeWidth='5' />
			<line x1='2' y1='65' x2='38' y2='65' stroke={`url(#${shimmerGradientId})`} strokeWidth='5' />
			<line x1='62' y1='65' x2='98' y2='65' stroke={`url(#${shimmerGradientId})`} strokeWidth='5' />
			<line x1='36' y1='48' x2='20' y2='32' stroke={`url(#${shimmerGradientId})`} strokeWidth='5' />
			<line x1='64' y1='48' x2='80' y2='32' stroke={`url(#${shimmerGradientId})`} strokeWidth='5' />
			<line x1='50' y1='76' x2='50' y2='113' stroke={`url(#${shimmerGradientId})`} strokeWidth='5' />
			<line x1='36' y1='82' x2='20' y2='98' stroke={`url(#${shimmerGradientId})`} strokeWidth='5' />
			<line x1='64' y1='82' x2='80' y2='98' stroke={`url(#${shimmerGradientId})`} strokeWidth='5' />
		</svg>
	);
};

export const RequestIndicator = () => (
	<div className='flex w-fit justify-start rounded-2xl bg-transparent px-4 py-2 text-foreground'>
		<ShimmerLogoLoader size={24} baseColor='rgb(0 0 0 / 0.55)' highlightColor='rgb(0 0 0 / 0.1)' />
	</div>
);
