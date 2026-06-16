"use client";

import { useTranslations } from "next-intl";

import { useSettings } from "@/hooks/use-settings";
import { ScrollArea } from "@webld/ui/components/scroll-area";

import { SettingsNav } from "./settings-nav";
import type { SettingsTabConfig } from "./settings-tabs";

type DesktopSettingsProps = {
	tabs: SettingsTabConfig[];
};

export const DesktopSettings = ({ tabs }: DesktopSettingsProps) => {
	const [activeSetting] = useSettings();
	const t = useTranslations("breadcrumbs");
	const activeTab = tabs.find((tab) => tab.name === activeSetting);

	return (
		<div className='flex max-h-full overflow-hidden'>
			<aside className='flex h-full w-50 flex-col bg-sidebar'>
				<div className='px-4 py-5'>
					<p className='px-2 text-sm font-semibold text-sidebar-foreground'>{t("settings")}</p>
				</div>
				<SettingsNav tabs={tabs} />
			</aside>
			<ScrollArea key={activeSetting} className='flex flex-1 flex-col'>
				<div className='p-10 pb-24'>{activeTab && <activeTab.component />}</div>
			</ScrollArea>
		</div>
	);
};
