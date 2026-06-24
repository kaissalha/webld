import type { ComponentProps } from "react";

import Image from "next/image";

import { getTranslations } from "next-intl/server";

import { cn } from "@webld/ui/lib/utils";

const testimonials = [
	{ id: "anomaly", img: "/avatars/10-size-160.webp" },
	{ id: "pineLabs", img: "/avatars/15-size-160.webp" },
	{ id: "concise", img: "/avatars/13-size-160.webp" },
	{ id: "orbital", img: "/avatars/12-size-160.webp" },
	{ id: "looply", img: "/avatars/11-size-160.webp" },
	{ id: "quirk", img: "/avatars/14-size-160.webp" },
] as const;

export const Testimonials = async ({ className, ...props }: ComponentProps<"section">) => {
	const t = await getTranslations("site.testimonials");

	return (
		<section
			id='testimonials'
			className={cn(
				"py-16 mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10 flex flex-col gap-10 sm:gap-16",
				className
			)}
			{...props}
		>
			<div className='flex max-w-2xl flex-col gap-6'>
				<div className='flex flex-col gap-2'>
					<h2 className='font-display text-3xl tracking-tight text-pretty text-olive-950 sm:text-5xl'>
						{t("title")}
					</h2>
				</div>
				<div className='text-base text-olive-700 text-pretty'>
					<p>{t("subtitle")}</p>
				</div>
			</div>
			<div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
				{testimonials.map((testimonial) => (
					<figure
						key={testimonial.id}
						className='flex flex-col justify-between gap-10 rounded-md bg-olive-950/2.5 p-6 text-sm text-olive-950'
					>
						<blockquote className='relative flex flex-col gap-4 *:first:before:absolute *:first:before:inline *:first:before:-translate-x-full *:first:before:rtl:translate-x-full *:first:before:content-["\\201C"] *:last:after:inline *:last:after:content-["\\201D"]'>
							<p>{t(`items.${testimonial.id}.quote`)}</p>
						</blockquote>
						<figcaption className='flex items-center gap-4'>
							<div className='flex size-12 overflow-hidden rounded-full outline -outline-offset-1 outline-black/5 *:size-full *:object-cover'>
								<Image
									src={testimonial.img}
									alt=''
									className='bg-background/75'
									width={160}
									height={160}
								/>
							</div>
							<div>
								<p className='font-semibold'>{t(`items.${testimonial.id}.name`)}</p>
								<p className='text-olive-700'>{t(`items.${testimonial.id}.byline`)}</p>
							</div>
						</figcaption>
					</figure>
				))}
			</div>
		</section>
	);
};
