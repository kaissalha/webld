"use client";

import { type ComponentProps, useId } from "react";

import { Badge } from "@starter/ui/components/badge";
import { cn } from "@starter/ui/lib/utils";

export const Stats = ({ className, ...props }: ComponentProps<"section">) => {
	const pathId = useId();

	return (
		<section id='stats' className={cn("py-16", className)} {...props}>
			<div className='mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10 flex flex-col gap-16'>
				<div className='flex max-w-2xl flex-col gap-6'>
					<Badge>Built for scale</Badge>
					<h2 className='font-display text-3xl tracking-tight text-pretty text-olive-950 sm:text-5xl'>
						The inbox powering customer conversations everywhere.
					</h2>
					<div className='text-base text-olive-700 text-pretty'>
						<p>
							Oatmeal helps teams deliver personal, organized, and fast customer support across the world.
							From small startups to enterprise teams, we process millions of messages each month — using
							a massive network of low wage workers stationed around the globe.
						</p>
					</div>
				</div>
				<div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
					<div className='col-span-2 grid grid-cols-2 gap-x-2 gap-y-10 sm:auto-cols-fr sm:grid-flow-col-dense'>
						<div className='border-s border-olive-950/20 ps-6'>
							<div className='text-2xl tracking-tight text-olive-950'>2M+</div>
							<p className='mt-2 text-sm text-olive-700'>
								Emails manually processed every week across thousands of teams.
							</p>
						</div>
						<div className='border-s border-olive-950/20 ps-6'>
							<div className='text-2xl tracking-tight text-olive-950'>99.98%</div>
							<p className='mt-2 text-sm text-olive-700'>
								Uptime — because your customers never stop complaining.
							</p>
						</div>
					</div>
				</div>
				<div className='pointer-events-none relative h-48 sm:h-64 lg:h-36'>
					<div className='absolute bottom-0 start-1/2 w-[150vw] max-w-[calc(var(--container-7xl)-(--spacing(10)*2))] -translate-x-1/2 rtl:translate-x-1/2'>
						<svg
							className='h-100 w-full fill-olive-950/2.5 stroke-olive-950/40'
							viewBox='0 0 1200 400'
							preserveAspectRatio='none'
						>
							<defs>
								<clipPath id={pathId}>
									<path d='M 0 400 L 0 383 C 396 362.7936732276819, 804 264.31672304481856, 1200 60 L 1200 60 L 1200 400 Z' />
								</clipPath>
							</defs>
							<path
								d='M 0 400 L 0 383 C 396 362.7936732276819, 804 264.31672304481856, 1200 60 L 1200 60 L 1200 400 Z'
								stroke='none'
							/>
							<g strokeWidth='1' strokeDasharray='4 3' clipPath={`url(#${pathId})`}>
								<line x1='0.5' y1='400' x2='0.5' y2='0' vectorEffect='non-scaling-stroke' />
								<line
									x1='92.3076923076923'
									y1='400'
									x2='92.3076923076923'
									y2='0'
									vectorEffect='non-scaling-stroke'
								/>
								<line
									x1='184.6153846153846'
									y1='400'
									x2='184.6153846153846'
									y2='0'
									vectorEffect='non-scaling-stroke'
								/>
								<line
									x1='276.9230769230769'
									y1='400'
									x2='276.9230769230769'
									y2='0'
									vectorEffect='non-scaling-stroke'
								/>
								<line
									x1='369.2307692307692'
									y1='400'
									x2='369.2307692307692'
									y2='0'
									vectorEffect='non-scaling-stroke'
								/>
								<line
									x1='461.53846153846155'
									y1='400'
									x2='461.53846153846155'
									y2='0'
									vectorEffect='non-scaling-stroke'
								/>
								<line
									x1='553.8461538461538'
									y1='400'
									x2='553.8461538461538'
									y2='0'
									vectorEffect='non-scaling-stroke'
								/>
								<line
									x1='646.1538461538462'
									y1='400'
									x2='646.1538461538462'
									y2='0'
									vectorEffect='non-scaling-stroke'
								/>
								<line
									x1='738.4615384615385'
									y1='400'
									x2='738.4615384615385'
									y2='0'
									vectorEffect='non-scaling-stroke'
								/>
								<line
									x1='830.7692307692307'
									y1='400'
									x2='830.7692307692307'
									y2='0'
									vectorEffect='non-scaling-stroke'
								/>
								<line
									x1='923.0769230769231'
									y1='400'
									x2='923.0769230769231'
									y2='0'
									vectorEffect='non-scaling-stroke'
								/>
								<line
									x1='1015.3846153846154'
									y1='400'
									x2='1015.3846153846154'
									y2='0'
									vectorEffect='non-scaling-stroke'
								/>
								<line
									x1='1107.6923076923076'
									y1='400'
									x2='1107.6923076923076'
									y2='0'
									vectorEffect='non-scaling-stroke'
								/>
								<line x1='1199.5' y1='400' x2='1199.5' y2='0' vectorEffect='non-scaling-stroke' />
							</g>
							<path
								d='M 0 383 C 396 362.7936732276819, 804 264.31672304481856, 1200 60'
								fill='none'
								strokeWidth='1'
								vectorEffect='non-scaling-stroke'
							/>
						</svg>
					</div>
				</div>
			</div>
		</section>
	);
};
