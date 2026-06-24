import type { ComponentProps } from "react";

import Image from "next/image";

import { ArrowRight, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Button } from "@webld/ui/components/button";
import { cn } from "@webld/ui/lib/utils";

import { Screenshot } from "../screenshot";

export const Hero = async ({ className, ...props }: ComponentProps<"section">) => {
	const t = await getTranslations("site.hero");

	return (
		<section
			id='hero'
			className={cn(
				"py-16 mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10 flex flex-col gap-16",
				className
			)}
			{...props}
		>
			<div className='flex flex-col gap-32'>
				<div className='flex flex-col items-start gap-6'>
					<Link
						href='#'
						className='group inline-flex max-w-full items-center gap-x-3 overflow-hidden rounded-full bg-olive-950/5 px-3 py-0.5 text-sm text-olive-950 hover:bg-olive-950/10'
					>
						<span className='truncate'>{t("announcement")}</span>
						<span className='h-3 w-px bg-olive-950/20' />
						<span className='inline-flex shrink-0 items-center gap-2 font-semibold'>
							{t("learnMore")} <ChevronRight className='size-3 rtl:rotate-180' strokeWidth={1.5} />
						</span>
					</Link>
					<h1 className='font-display text-5xl tracking-tight text-balance sm:text-7xl text-olive-950 max-w-5xl'>
						{t("title")}
					</h1>
					<div className='text-lg text-olive-700 flex max-w-3xl flex-col gap-4'>
						<p>{t("subtitle")}</p>
					</div>
					<div className='flex items-center gap-4'>
						<Button size='lg' asChild>
							<Link href='#'>{t("startTrial")}</Link>
						</Button>

						<Button variant='ghost' size='lg' asChild>
							<Link href='#'>
								{t("seeHowItWorks")} <ArrowRight className='size-4 rtl:rotate-180' strokeWidth={1.5} />
							</Link>
						</Button>
					</div>
				</div>
				<>
					<Screenshot className='rounded-md lg:hidden' wallpaper='green' placement='bottom-end'>
						<Image
							src='/screenshots/1-left-1670-top-1408.webp'
							alt=''
							width={1670}
							height={1408}
							className='bg-background/75 md:hidden'
						/>
						<Image
							src='/screenshots/1-left-2000-top-1408.webp'
							alt=''
							width={2000}
							height={1408}
							className='bg-background/75 max-md:hidden'
						/>
					</Screenshot>
					<Screenshot className='rounded-lg max-lg:hidden' wallpaper='green' placement='bottom'>
						<Image
							src='/screenshots/1.webp'
							alt=''
							className='bg-background/75'
							width={3440}
							height={1990}
						/>
					</Screenshot>
				</>
			</div>
			<div className='mx-auto grid w-full grid-cols-2 place-items-center gap-x-6 gap-y-10 sm:grid-cols-3 sm:gap-x-10 lg:mx-auto lg:inline-grid lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-1 lg:gap-12'>
				<span className='flex h-8 items-stretch'>
					<Image src='/logos/9-color-black-height-32.svg' alt='' width={51} height={32} />
				</span>
				<span className='flex h-8 items-stretch'>
					<Image src='/logos/10-color-black-height-32.svg' alt='' width={70} height={32} />
				</span>
				<span className='flex h-8 items-stretch'>
					<Image src='/logos/11-color-black-height-32.svg' alt='' width={100} height={32} />
				</span>
				<span className='flex h-8 items-stretch'>
					<Image src='/logos/12-color-black-height-32.svg' alt='' width={85} height={32} />
				</span>
				<span className='flex h-8 items-stretch'>
					<Image src='/logos/13-color-black-height-32.svg' alt='' width={75} height={32} />
				</span>
				<span className='flex h-8 items-stretch'>
					<Image src='/logos/8-color-black-height-32.svg' alt='' width={85} height={32} />
				</span>
			</div>
		</section>
	);
};
