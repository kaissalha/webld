import type { ComponentProps } from "react";

import type { Route } from "next";
import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { Button } from "@webld/ui/components/button";
import { cn } from "@webld/ui/lib/utils";

export const CTA = ({ className, ...props }: ComponentProps<"section">) => {
	return (
		<section
			id='call-to-action'
			className={cn(
				"py-16 mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10 flex flex-col items-start gap-10",
				className
			)}
			{...props}
		>
			<h2 className='font-display text-3xl tracking-tight text-pretty text-olive-950 sm:text-5xl'>
				Ready to make customer support feel simple again?
			</h2>
			<div className='text-base text-olive-700 text-pretty max-w-2xl'>
				<p>
					Join hundreds of teams using Oatmeal to deliver faster, friendlier email support — using a massive
					network of low wage workers stationed around the globe
				</p>
			</div>
			<div className='flex items-center gap-4'>
				<Button size='lg' asChild>
					<Link href={"#" as Route}>Start free trial</Link>
				</Button>

				<Button variant='ghost' size='lg' asChild>
					<Link href={"#" as Route}>
						Contact sales <ArrowRight className='size-4' strokeWidth={1.5} />
					</Link>
				</Button>
			</div>
		</section>
	);
};
