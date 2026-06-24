export default function ChatLoading() {
	return (
		<>
			<header className='sticky top-0 z-50 flex shrink-0 items-center justify-between bg-background px-4 py-3 md:px-5 md:py-3.5'>
				<div className='flex items-center gap-3 md:gap-4'>
					<div className='size-9 animate-pulse rounded-md bg-muted md:hidden' />
					<div className='h-5 w-16 animate-pulse rounded bg-muted' />
				</div>
				<div className='size-9 animate-pulse rounded-md bg-muted' />
			</header>
			<div className='min-h-0 flex-1 overflow-hidden'>
				<div className='relative flex h-full w-full flex-col items-center'>
					<div className='absolute inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4'>
						<div className='h-28 w-full max-w-3xl animate-pulse rounded-2xl bg-muted' />
					</div>
				</div>
			</div>
		</>
	);
}
