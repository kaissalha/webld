import type { ComponentProps } from "react";

import Image from "next/image";

import { cn } from "@webld/ui/lib/utils";

export const PricingTestimonial = ({ className, ...props }: ComponentProps<"section">) => {
	return (
		<section
			className={cn("mx-auto w-full max-w-2xl px-6 py-16 md:max-w-3xl lg:max-w-7xl lg:px-10", className)}
			{...props}
		>
			<figure className='text-olive-950'>
				<blockquote className='mx-auto flex max-w-240 flex-col gap-4 text-center font-display text-3xl tracking-tight text-pretty *:first:before:content-["\\201C"] *:last:after:content-["\\201D"] sm:text-5xl'>
					<p>
						Oatmeal has completely transformed our customer support operations. The blend of AI efficiency
						and human empathy has allowed us to provide exceptional service while significantly reducing
						costs.
					</p>
				</blockquote>
				<figcaption className='mt-16 flex flex-col items-center'>
					<div className='flex size-12 overflow-hidden rounded-full outline -outline-offset-1 outline-black/5 *:size-full *:object-cover'>
						<Image
							src='/avatars/10-size-160.webp'
							alt=''
							className='bg-background/75'
							width={160}
							height={160}
						/>
					</div>
					<p className='mt-4 text-center text-sm font-semibold'>Jordan Rogers</p>
					<p className='text-center text-sm text-olive-700'>Founder at Anomaly</p>
				</figcaption>
			</figure>
		</section>
	);
};
