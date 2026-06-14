import { headers } from "next/headers";

import { getTranslations } from "next-intl/server";

import { auth } from "@webld/server/auth";

import { HomePageGreeting } from "./home-page-greeting";

export const HomePageHeaderSkeleton = () => (
	<div className='mb-6 min-h-14'>
		<div className='flex items-start justify-between gap-4'>
			<div className='min-w-0 flex-1 space-y-2'>
				<div className='h-9 w-56 max-w-full animate-pulse rounded bg-muted' />
				<div className='h-5 w-72 max-w-full animate-pulse rounded bg-muted' />
			</div>
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
			</div>
		</div>
	);
};
