"use client";

import { LogOutIcon, SettingsIcon, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useSettings } from "@/hooks/use-settings";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@webld/ui/components/sidebar";
import { useHydrated } from "@webld/ui/hooks/use-hydrated";

type ActionMenuItem = {
	key: string;
	title: string;
	onClick: () => void | Promise<void>;
	icon: LucideIcon;
};

export const NavSecondary = () => {
	const t = useTranslations();
	const { isMobile, setOpenMobile } = useSidebar("navigation");
	const isHydrated = useHydrated();
	const router = useRouter();
	const [, setActiveSetting] = useSettings();

	const items: ActionMenuItem[] = [
		{
			key: "settings",
			title: t("breadcrumbs.settings"),
			onClick: () => setActiveSetting("list"),
			icon: SettingsIcon,
		},
		{
			key: "logout",
			title: t("account.logout"),
			onClick: async () => {
				await authClient.signOut();
				router.push("/login");
			},
			icon: LogOutIcon,
		},
	];

	const handleActionItemClick = (item: ActionMenuItem) => {
		void item.onClick();
		if (isMobile) {
			setOpenMobile(false);
		}
	};

	return (
		<SidebarGroup>
			<SidebarMenu>
				{items.map((item) => {
					return (
						<SidebarMenuItem key={item.key}>
							<SidebarMenuButton tooltip={item.title} onClick={() => handleActionItemClick(item)}>
								<item.icon />
								{isMobile && isHydrated && <span>{item.title}</span>}
							</SidebarMenuButton>
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
};
