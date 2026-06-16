"use client";

import { useTranslations } from "next-intl";

import { useSettings } from "@/hooks/use-settings";
import { ScrollArea } from "@webld/ui/components/scroll-area";

import { SettingsNav } from "./settings-nav";
import type { SettingsTabConfig } from "./settings-tabs";

type MobileSettingsProps = {
	tabs: SettingsTabConfig[];
};

export const MobileSettings = ({ tabs }: MobileSettingsProps) => {
	const [activeSetting, setActiveSetting] = useSettings();
	const t = useTranslations("breadcrumbs");
	const isListView = !activeSetting || activeSetting === "list";
	const activeTab = isListView ? null : tabs.find((tab) => tab.name === activeSetting);

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
