"use client";

import { HomeIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@starter/ui/components/sidebar";
import { useHydrated } from "@starter/ui/hooks/use-hydrated";

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
			exactMatch: true,
			matchPrefixes: ["/dashboard/chat"],
		},
	];

	return (
		<SidebarGroup>
			<SidebarMenu>
				{items.map((item) => {
					const active =
						isMenuItemActive(item.url, item.exactMatch) ||
						(item.matchPrefixes ?? []).some((prefix) => isMenuItemActive(prefix, false));

					return (
						<Link href={item.url} key={item.title}>
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton
									tooltip={item.title}
									isActive={active}
									onClick={() => setOpenMobile(false)}
								>
									{item.icon && <item.icon />}
									{isMobile && isHydrated && <span>{item.title}</span>}
								</SidebarMenuButton>
							</SidebarMenuItem>
						</Link>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
};
