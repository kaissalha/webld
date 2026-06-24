import { HomePageHeaderSkeleton } from "./components/home-page-header";

export default function DashboardHomeLoading() {
	return (
		<>
			<header className='shrink-0 px-4 py-3 md:px-8 md:py-3.5'>
				<div className='size-9 animate-pulse rounded-md bg-muted md:hidden' />
			</header>
			<div className='min-h-0 flex-1 overflow-y-auto'>
				<div className='w-full px-4 pb-8 md:px-8'>
					<HomePageHeaderSkeleton />
				</div>
			</div>
		</>
	);
}
