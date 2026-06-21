"use client";

import { HomeIcon, MessageCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@webld/ui/components/sidebar";
import { useHydrated } from "@webld/ui/hooks/use-hydrated";

import { useIsMenuItemActive } from "./utils/use-is-menu-item-active";

export const NavMain = () => {
	const t = useTranslations();
	const { isMenuItemActive } = useIsMenuItemActive();
	const { isMobile, setOpenMobile } = useSidebar("navigation");
	const isHydrated = useHydrated();

	const items = [
		{
			title: t("breadcrumbs.home"),
			url: "/dashboard",
			icon: HomeIcon,
		},
		{
			title: t("breadcrumbs.chat"),
			url: "/dashboard/chat",
			icon: MessageCircleIcon,
		},
	];

	return (
		<SidebarGroup>
			<SidebarMenu>
				{items.map((item) => (
					<SidebarMenuItem key={item.title}>
						<SidebarMenuButton asChild isActive={isMenuItemActive(item.url, true)} tooltip={item.title}>
							<Link href={item.url} onClick={() => setOpenMobile(false)}>
								<item.icon />
								{isMobile && isHydrated && <span>{item.title}</span>}
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
};
