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

const AppSidebarFallback = () => (
	<Sidebar collapsible='icon' purpose='navigation'>
		<SidebarHeader>
			<div className='mx-auto size-7 animate-pulse rounded-lg bg-sidebar-accent' />
		</SidebarHeader>
		<SidebarContent>
			<div className='flex flex-col gap-1 px-3 py-2'>
				{["home", "chat"].map((item) => (
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

export default function DashboardLayout({ children }: { children: ReactNode }) {
	return (
		<HydrateClient>
			<SidebarProvider purpose='navigation' className='flex flex-1' defaultOpen={false}>
				<Suspense fallback={<AppSidebarFallback />}>
					<AppSidebar />
				</Suspense>
				<SidebarInset>
					<div className='flex h-[calc(100dvh-var(--sidebar-inset-top,0px))] max-h-[calc(100dvh-var(--sidebar-inset-top,0px))] min-h-0 flex-col overflow-hidden'>
						{children}
					</div>
				</SidebarInset>
			</SidebarProvider>
			<Suspense fallback={null}>
				<SettingsModal />
			</Suspense>
		</HydrateClient>
	);
}
