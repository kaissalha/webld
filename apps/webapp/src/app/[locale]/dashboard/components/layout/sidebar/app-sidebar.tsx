import type * as React from "react";

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@starter/ui/components/sidebar";

import { AppSidebarHeader } from "./app-sidebar-header";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";

export const AppSidebar = ({ ...props }: React.ComponentProps<typeof Sidebar>) => {
	return (
		<Sidebar collapsible='icon' purpose='navigation' {...props}>
			<SidebarHeader>
				<AppSidebarHeader />
			</SidebarHeader>
			<SidebarContent>
				<NavMain />
			</SidebarContent>
			<SidebarFooter>
				<NavSecondary />
			</SidebarFooter>
		</Sidebar>
	);
};
