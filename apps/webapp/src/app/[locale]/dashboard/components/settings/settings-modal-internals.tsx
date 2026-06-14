"use client";

import { useCallback, useMemo } from "react";

import { Building2Icon, CreditCardIcon, LogOutIcon, ShieldIcon, UserIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { type Settings, useSettings } from "@/hooks/use-settings";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { ScrollArea } from "@starter/ui/components/scroll-area";
import { cn } from "@starter/ui/lib/utils";

import { OrganizationTab } from "./organization-tab";
import { ProfileTab } from "./profile-tab";
import { SecurityTab } from "./security-tab";
import { SubscriptionTab } from "./subscription-tab";
// import { TeamTab } from "./team-tab";

export type SettingsTabConfig = {
	name: Exclude<Settings, "list">;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	component: React.FC;
};

export const useSettingsTabs = (): SettingsTabConfig[] => {
	const t = useTranslations("settings");

	return useMemo(
		() => [
			{ name: "profile", label: t("tabs.profile"), icon: UserIcon, component: ProfileTab },
			{ name: "organization", label: t("tabs.organization"), icon: Building2Icon, component: OrganizationTab },
			// { name: "team", label: t("tabs.team"), icon: UsersIcon, component: TeamTab },
			{ name: "security", label: t("tabs.security"), icon: ShieldIcon, component: SecurityTab },
			{ name: "subscription", label: t("tabs.subscription"), icon: CreditCardIcon, component: SubscriptionTab },
		],
		[t]
	);
};

export const SettingsNav = ({ tabs }: { tabs: SettingsTabConfig[] }) => {
	const [activeSetting, setActiveSetting] = useSettings();
	const t = useTranslations("account");
	const router = useRouter();

	const handleSignOut = useCallback(async () => {
		await authClient.signOut();
		router.push("/login");
	}, [router]);

	return (
		<nav className='flex flex-1 flex-col overflow-y-auto'>
			<ul className='flex flex-1 flex-col gap-0.5 px-2 py-1'>
				{tabs.map((tab) => (
					<li key={tab.name}>
						<button
							type='button'
							onClick={() => setActiveSetting(tab.name)}
							className={cn(
								"peer/menu-button flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-[background,color] [&>svg]:size-4 [&>svg]:shrink-0",
								activeSetting === tab.name
									? "bg-sidebar-accent text-sidebar-accent-foreground"
									: "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
							)}
						>
							<tab.icon />
							<span>{tab.label}</span>
						</button>
					</li>
				))}
			</ul>
			<ul className='px-2 py-2'>
				<li>
					<button
						type='button'
						onClick={handleSignOut}
						className='peer/menu-button flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition-[background,color] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0'
					>
						<LogOutIcon />
						<span>{t("logout")}</span>
					</button>
				</li>
			</ul>
		</nav>
	);
};

export const DesktopSettings = ({ tabs }: { tabs: SettingsTabConfig[] }) => {
	const [activeSetting] = useSettings();
	const t = useTranslations("breadcrumbs");

	const activeTab = useMemo(() => tabs.find((tab) => tab.name === activeSetting), [tabs, activeSetting]);

	return (
		<div className='flex max-h-full overflow-hidden'>
			<aside className='flex h-full w-50 flex-col bg-sidebar'>
				<div className='px-4 py-5'>
					<p className='px-2 text-sm font-semibold text-sidebar-foreground'>{t("settings")}</p>
				</div>
				<SettingsNav tabs={tabs} />
			</aside>
			<ScrollArea key={activeSetting} className='flex flex-1 flex-col'>
				<div className='p-10 pb-24'>{activeTab ? <activeTab.component /> : null}</div>
			</ScrollArea>
		</div>
	);
};

export const MobileSettings = ({ tabs }: { tabs: SettingsTabConfig[] }) => {
	const [activeSetting, setActiveSetting] = useSettings();
	const t = useTranslations("breadcrumbs");

	const isListView = !activeSetting || activeSetting === "list";
	const activeTab = useMemo(
		() => (!isListView ? tabs.find((tab) => tab.name === activeSetting) : null),
		[tabs, activeSetting, isListView]
	);

	return (
		<div className='flex h-full max-h-[calc(100%-20px)] flex-col pt-7'>
			{activeTab ? (
				<ScrollArea key={activeSetting} className='flex-1'>
					<div className='flex flex-col gap-4 px-4 pb-4'>
						<button
							type='button'
							onClick={() => setActiveSetting("list")}
							className='flex items-center gap-1 text-sm text-muted-foreground'
						>
							← {t("settings")}
						</button>
						<activeTab.component />
					</div>
				</ScrollArea>
			) : (
				<div className='flex h-full flex-col bg-sidebar'>
					<p className='px-6 pb-2 pt-4 text-2xl font-semibold text-sidebar-foreground'>{t("settings")}</p>
					<SettingsNav tabs={tabs} />
				</div>
			)}
		</div>
	);
};
