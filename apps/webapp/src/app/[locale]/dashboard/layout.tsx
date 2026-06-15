import { Suspense, type ReactNode } from "react";

import { HydrateClient } from "@/lib/server/react-query";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarInset,
	SidebarProvider,
} from "@webld/ui/components/sidebar";

import { AppSidebar } from "./components/layout/sidebar/app-sidebar";
import { SettingsModal } from "./components/settings/settings-modal";
import { PlanSelectionDialog } from "./components/subscription/plan-selection-dialog";

const AppSidebarFallback = () => (
	<Sidebar collapsible='icon' purpose='navigation'>
		<SidebarHeader>
			<div className='mx-auto size-7 animate-pulse rounded-lg bg-sidebar-accent' />
		</SidebarHeader>
		<SidebarContent>
			<div className='flex flex-col gap-1 px-3 py-2'>
				{["home", "contacts"].map((item) => (
					<div key={item} className='flex h-8 items-center gap-2 rounded-md px-2'>
						<div className='size-4 animate-pulse rounded bg-sidebar-accent' />
					</div>
				))}
			</div>
		</SidebarContent>
		<SidebarFooter>
			<div className='flex flex-col gap-1'>
				{["settings", "logout"].map((item) => (
					<div key={item} className='flex h-8 items-center gap-2 rounded-md px-2'>
						<div className='size-4 animate-pulse rounded bg-sidebar-accent' />
					</div>
				))}
			</div>
		</SidebarFooter>
	</Sidebar>
);

const DashboardContentFallback = () => (
	<div className='flex h-[calc(100dvh-var(--sidebar-inset-top,0px))] max-h-[calc(100dvh-var(--sidebar-inset-top,0px))] flex-col overflow-hidden'>
		<header className='shrink-0 px-4 py-3 md:px-8 md:py-3.5'>
			<div className='size-9 animate-pulse rounded-md bg-muted md:hidden' />
		</header>
		<div className='min-h-0 flex-1 overflow-y-auto'>
			<div className='w-full px-4 md:px-8'>
				<div className='mb-6 space-y-3'>
					<div className='h-8 w-48 animate-pulse rounded bg-muted' />
					<div className='h-4 w-72 max-w-full animate-pulse rounded bg-muted' />
				</div>
				<div className='grid gap-4 pb-10 md:grid-cols-2'>
					{["contacts", "knowledge"].map((item) => (
						<div key={item} className='rounded-xl border bg-card p-4'>
							<div className='mb-4 h-4 w-28 animate-pulse rounded bg-muted' />
							<div className='space-y-2'>
								<div className='h-8 w-20 animate-pulse rounded bg-muted' />
								<div className='h-4 w-full animate-pulse rounded bg-muted' />
								<div className='h-4 w-4/5 animate-pulse rounded bg-muted' />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	</div>
);

export default function DashboardLayout({ children }: { children: ReactNode }) {
	return (
		<HydrateClient>
			<SidebarProvider purpose='navigation' className='flex flex-1' defaultOpen={false}>
				<Suspense fallback={<AppSidebarFallback />}>
					<AppSidebar />
				</Suspense>
				<SidebarInset>
					<Suspense fallback={<DashboardContentFallback />}>{children}</Suspense>
				</SidebarInset>
			</SidebarProvider>
			<PlanSelectionDialog />
			<Suspense fallback={null}>
				<SettingsModal />
			</Suspense>
		</HydrateClient>
	);
}
