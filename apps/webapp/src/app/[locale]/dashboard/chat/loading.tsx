export default function ChatLoading() {
	return (
		<>
			<header className='sticky top-0 z-50 flex shrink-0 items-center justify-between bg-background px-4 py-3 md:px-5 md:py-3.5'>
				<div className='flex items-center gap-3 md:gap-4'>
					<div className='size-7 animate-pulse rounded-md bg-muted md:hidden' />
					<div className='h-5 w-16 animate-pulse rounded bg-muted' />
				</div>
				<div className='size-9 animate-pulse rounded-md bg-muted' />
			</header>
			<div className='min-h-0 flex-1 overflow-hidden'>
				<div className='relative flex h-full w-full flex-col items-center overflow-hidden'>
					<div className='absolute inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4'>
						{/* Mirrors the ChatComposer shell so the page chrome doesn't jump when it loads */}
						<div className='w-full max-w-3xl'>
							<div className='flex flex-col gap-1 rounded-3xl bg-card p-4 pb-2 shadow-chat-input'>
								<div className='flex min-h-10 items-center px-1'>
									<div className='h-4 w-40 animate-pulse rounded bg-muted' />
								</div>
								<div className='flex w-full items-center justify-between gap-2'>
									<div className='size-4.5 animate-pulse rounded bg-muted' />
									<div className='size-9 animate-pulse rounded-full bg-muted' />
								</div>
							</div>
						</div>
					</div>
					<div className='pointer-events-none absolute inset-x-0 bottom-0 z-30 h-30 bg-linear-to-t from-background to-transparent' />
				</div>
			</div>
		</>
	);
}
