import type { ComponentProps } from "react";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { cn } from "@webld/ui/lib/utils";

import { Screenshot } from "../screenshot";

export const Features = ({ className, ...props }: ComponentProps<"section">) => {
	return (
		<section
			id='features'
			className={cn(
				"py-16 mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10 flex flex-col gap-10 sm:gap-16",
				className
			)}
			{...props}
		>
			<div className='flex max-w-2xl flex-col gap-6'>
				<div className='flex flex-col gap-2'>
					<div className='text-sm font-semibold text-olive-700'>Powerful features</div>
					<h2 className='font-display text-3xl tracking-tight text-pretty text-olive-950 sm:text-5xl'>
						Everything you need to deliver personal, organized, and delightful support.
					</h2>
				</div>
				<div className='text-base text-olive-700 text-pretty'>
					<p>
						Work smarter, reply faster, and keep every customer conversation right where it belongs — in one
						simple inbox.
					</p>
				</div>
			</div>
			<div className='grid grid-cols-1 gap-2 lg:grid-cols-2'>
				{/* Feature 1: Shared Inbox */}
				<div className='rounded-lg bg-olive-950/2.5 p-2'>
					<div className='relative overflow-hidden rounded-sm'>
						<Screenshot wallpaper='purple' placement='bottom-end'>
							<Image
								src='/screenshots/1-left-1000-top-800.webp'
								alt=''
								className='bg-background/75 sm:hidden'
								width={1000}
								height={800}
							/>
							<Image
								src='/screenshots/1-left-1800-top-660.webp'
								alt=''
								className='bg-background/75 max-sm:hidden lg:hidden'
								width={1800}
								height={660}
							/>
							<Image
								src='/screenshots/1-left-1300-top-1300.webp'
								alt=''
								className='bg-background/75 max-lg:hidden xl:hidden'
								width={1300}
								height={1300}
							/>
							<Image
								src='/screenshots/1-left-1800-top-1250.webp'
								alt=''
								className='bg-background/75 max-xl:hidden'
								width={1800}
								height={1250}
							/>
						</Screenshot>
					</div>
					<div className='flex flex-col gap-4 p-6 sm:p-10 lg:p-6'>
						<div>
							<h3 className='text-base font-medium text-olive-950'>Shared Inbox</h3>
							<div className='mt-2 flex flex-col gap-4 text-sm text-olive-700'>
								<p>
									Keep every customer conversation in one clean, collaborative inbox. A single source
									of truth is much easier to ignore.
								</p>
							</div>
						</div>
						<Link
							href={"#" as Route}
							className='inline-flex items-center gap-2 text-sm font-medium text-olive-950'
						>
							See how it works <ArrowRight className='size-4' strokeWidth={1.5} />
						</Link>
					</div>
				</div>

				{/* Feature 2: Inbox Agent */}
				<div className='rounded-lg bg-olive-950/2.5 p-2'>
					<div className='relative overflow-hidden rounded-sm'>
						<Screenshot wallpaper='blue' placement='bottom-start'>
							<Image
								src='/screenshots/1-right-1000-top-800.webp'
								alt=''
								className='bg-background/75 sm:hidden'
								width={1000}
								height={800}
							/>
							<Image
								src='/screenshots/1-right-1800-top-660.webp'
								alt=''
								className='bg-background/75 max-sm:hidden lg:hidden'
								width={1800}
								height={660}
							/>
							<Image
								src='/screenshots/1-right-1300-top-1300.webp'
								alt=''
								className='bg-background/75 max-lg:hidden xl:hidden'
								width={1300}
								height={1300}
							/>
							<Image
								src='/screenshots/1-right-1800-top-1250.webp'
								alt=''
								className='bg-background/75 max-xl:hidden'
								width={1800}
								height={1250}
							/>
						</Screenshot>
					</div>
					<div className='flex flex-col gap-4 p-6 sm:p-10 lg:p-6'>
						<div>
							<h3 className='text-base font-medium text-olive-950'>Inbox Agent</h3>
							<div className='mt-2 flex flex-col gap-4 text-sm text-olive-700'>
								<p>
									Get valuable context without having to read through your customer&apos;s long, angry
									email thread.
								</p>
							</div>
						</div>
						<Link
							href={"#" as Route}
							className='inline-flex items-center gap-2 text-sm font-medium text-olive-950'
						>
							See how it works <ArrowRight className='size-4' strokeWidth={1.5} />
						</Link>
					</div>
				</div>
			</div>
		</section>
	);
};
