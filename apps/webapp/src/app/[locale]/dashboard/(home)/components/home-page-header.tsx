import { Suspense } from "react";

import { headers } from "next/headers";

import { getTranslations } from "next-intl/server";

import { auth } from "@starter/server/auth";

import { HomePageGreeting } from "./home-page-greeting";
import { HomePageWeather } from "./home-page-weather";

const HomePageWeatherFallback = () => (
	<div className='hidden h-14 w-28 shrink-0 items-center gap-2 md:flex'>
		<div className='size-14 animate-pulse rounded-full bg-muted' />
		<div className='h-8 w-12 animate-pulse rounded bg-muted' />
	</div>
);

export const HomePageHeaderSkeleton = () => (
	<div className='mb-6 min-h-14'>
		<div className='flex items-start justify-between gap-4'>
			<div className='min-w-0 flex-1 space-y-2'>
				<div className='h-9 w-56 max-w-full animate-pulse rounded bg-muted' />
				<div className='h-5 w-72 max-w-full animate-pulse rounded bg-muted' />
			</div>
			<HomePageWeatherFallback />
		</div>
	</div>
);

export const HomePageHeader = async () => {
	const [requestHeaders, tHome] = await Promise.all([headers(), getTranslations("dashboard.home")]);
	const session = await auth.api.getSession({
		headers: requestHeaders,
	});
	const firstName = session?.user?.name?.split(" ")[0];

	return (
		<div className='mb-6 min-h-14'>
			<div className='flex items-start justify-between gap-4'>
				<div className='min-w-0 flex-1'>
					<HomePageGreeting firstName={firstName} />
					<p className='text-sm text-muted-foreground'>{tHome("subtitle")}</p>
				</div>
				<Suspense fallback={<HomePageWeatherFallback />}>
					<div className='hidden md:flex'>
						<HomePageWeather variant='desktopGreeting' />
					</div>
				</Suspense>
			</div>
		</div>
	);
};
