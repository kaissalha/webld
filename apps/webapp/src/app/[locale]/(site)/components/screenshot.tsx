import type { ComponentProps, ReactNode } from "react";

import { cn } from "@webld/ui/lib/utils";

const html = String.raw;

const noisePattern = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(
	html`
		<svg xmlns="http://www.w3.org/2000/svg" width="250" height="250" viewBox="0 0 100 100">
			<filter id="n">
				<feTurbulence
					type="turbulence"
					baseFrequency="1.4"
					numOctaves="1"
					seed="2"
					stitchTiles="stitch"
					result="n"
				/>
				<feComponentTransfer result="g">
					<feFuncR type="linear" slope="4" intercept="1" />
					<feFuncG type="linear" slope="4" intercept="1" />
					<feFuncB type="linear" slope="4" intercept="1" />
				</feComponentTransfer>
				<feColorMatrix type="saturate" values="0" in="g" />
			</filter>
			<rect width="100%" height="100%" filter="url(#n)" />
		</svg>
	`.replace(/\s+/g, " ")
)}")`;

export const Screenshot = ({
	children,
	wallpaper,
	placement,
	className,
	...props
}: {
	wallpaper: "green" | "blue" | "purple" | "brown";
	placement: "bottom" | "bottom-start" | "bottom-end" | "top" | "top-start" | "top-end";
	children: ReactNode;
} & Omit<ComponentProps<"div">, "color">) => {
	return (
		<div
			data-color={wallpaper}
			data-placement={placement}
			className={cn(
				"group relative overflow-hidden bg-linear-to-b data-[color=blue]:from-slate-500 data-[color=blue]:to-slate-400 data-[color=brown]:from-stone-500 data-[color=brown]:to-stone-600 data-[color=green]:from-olive-400 data-[color=green]:to-olive-600 data-[color=purple]:from-purple-500 data-[color=purple]:to-rose-500",
				className
			)}
			{...props}
		>
			<div
				className='absolute inset-0 opacity-30 mix-blend-overlay'
				style={{
					backgroundPosition: "center",
					backgroundImage: noisePattern,
				}}
			/>
			<div className='relative'>
				<div className='relative [--padding:min(10%,--spacing(16))] group-data-[placement=bottom]:px-(--padding) group-data-[placement=bottom]:pt-(--padding) group-data-[placement=bottom-start]:pt-(--padding) group-data-[placement=bottom-start]:pe-(--padding) group-data-[placement=bottom-end]:pt-(--padding) group-data-[placement=bottom-end]:ps-(--padding) group-data-[placement=top]:px-(--padding) group-data-[placement=top]:pb-(--padding) group-data-[placement=top-start]:pe-(--padding) group-data-[placement=top-start]:pb-(--padding) group-data-[placement=top-end]:pb-(--padding) group-data-[placement=top-end]:ps-(--padding)'>
					<div className='*:relative *:ring-1 *:ring-black/10 group-data-[placement=bottom]:*:rounded-t-sm group-data-[placement=bottom-start]:*:rounded-se-sm group-data-[placement=bottom-end]:*:rounded-ss-sm group-data-[placement=top]:*:rounded-b-sm group-data-[placement=top-start]:*:rounded-ee-sm group-data-[placement=top-end]:*:rounded-es-sm'>
						{children}
					</div>
				</div>
			</div>
		</div>
	);
};
