import type { ComponentProps } from "react";

import Image from "next/image";

import { cn } from "@webld/ui/lib/utils";

const testimonials = [
	{
		quote: "Oatmeal has completely transformed our customer support operations. To be fair, we weren't doing any customer support at all so the bar was pretty low.",
		img: "/avatars/10-size-160.webp",
		name: "Jordan Rogers",
		byline: "Founder at Anomaly",
	},
	{
		quote: "We use Oatmeal's automation features to make cancellation requests disappear into a black hole, improving our retention rates by over 300%.",
		img: "/avatars/15-size-160.webp",
		name: "Lynn Marshall",
		byline: "Founder at Pine Labs",
	},
	{
		quote: "I've been using the spare time that Oatmeal has freed up to work not just one, but two other jobs, all while hitting my core KPIs. My bosses have no idea.",
		img: "/avatars/13-size-160.webp",
		name: "Rajat Singh",
		byline: "Head of Support at Concise",
	},
	{
		quote: "Oatmeal has given us key insights into how much our customers absolutely hate using our product and how we can improve it to stop them from leaving us.",
		img: "/avatars/12-size-160.webp",
		name: "John Walters",
		byline: "CPO at Orbital",
	},
	{
		quote: "As a solo founder, Oatmeal has been a lifesaver. It makes it look like Looply is an actual company with multiple employees, when in reality it's just me and an AI.",
		img: "/avatars/11-size-160.webp",
		name: "Noah Gold",
		byline: "CEO at Looply",
	},
	{
		quote: "Thanks to Oatmeal, we've managed to cut our support costs in half by laying off dozens of employees, while still improving response times and customer satisfaction.",
		img: "/avatars/14-size-160.webp",
		name: "Mark Levinson",
		byline: "COO at Quirk",
	},
];

export const Testimonials = ({ className, ...props }: ComponentProps<"section">) => {
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
						What our customers are saying
					</h2>
				</div>
				<div className='text-base text-olive-700 text-pretty'>
					<p>We&apos;ve given these customers a significant discount in exchange for their honest reviews.</p>
				</div>
			</div>
			<div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
				{testimonials.map((testimonial) => (
					<figure
						key={testimonial.name}
						className='flex flex-col justify-between gap-10 rounded-md bg-olive-950/2.5 p-6 text-sm text-olive-950'
					>
						<blockquote className='relative flex flex-col gap-4 *:first:before:absolute *:first:before:inline *:first:before:-translate-x-full *:first:before:rtl:translate-x-full *:first:before:content-["\\201C"] *:last:after:inline *:last:after:content-["\\201D"]'>
							<p>{testimonial.quote}</p>
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
								<p className='font-semibold'>{testimonial.name}</p>
								<p className='text-olive-700'>{testimonial.byline}</p>
							</div>
						</figcaption>
					</figure>
				))}
			</div>
		</section>
	);
};
