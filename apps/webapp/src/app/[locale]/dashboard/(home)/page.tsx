import { Suspense } from "react";

import { SidebarTrigger } from "@webld/ui/components/sidebar";

import { HomePageHeader, HomePageHeaderSkeleton } from "./components/home-page-header";

export default async function DashboardPage() {
	return (
		<div className='flex h-[calc(100dvh-var(--sidebar-inset-top,0px))] max-h-[calc(100dvh-var(--sidebar-inset-top,0px))] flex-col overflow-hidden'>
			<header className='shrink-0 px-4 py-3 md:px-8 md:py-3.5'>
				<div className='flex items-center justify-between gap-3 md:hidden'>
					<SidebarTrigger className='-ms-1 shrink-0' purpose='navigation' />
				</div>
			</header>

			<div className='min-h-0 flex-1 overflow-y-auto'>
				<div className='w-full px-4 pb-8 md:px-8'>
					<Suspense fallback={<HomePageHeaderSkeleton />}>
						<HomePageHeader />
					</Suspense>
				</div>
			</div>
		</div>
	);
}
