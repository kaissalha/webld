"use client";

import { useTranslations } from "next-intl";

import { useSettings } from "@/hooks/use-settings";
import {
	Credenza,
	CredenzaContent,
	CredenzaDescription,
	CredenzaHeader,
	CredenzaTitle,
} from "@webld/ui/components/credenza";
import { useIsMobile } from "@webld/ui/hooks/use-mobile";

import { DesktopSettings, MobileSettings, useSettingsTabs } from "./settings-modal-internals";

export const SettingsModal = () => {
	const t = useTranslations("breadcrumbs");
	const [activeSetting, setActiveSetting] = useSettings();
	const isMobile = useIsMobile();
	const tabs = useSettingsTabs();

	return (
		<Credenza open={!!activeSetting} onOpenChange={(open) => !open && setActiveSetting(null)}>
			<CredenzaContent className='h-160 max-h-[90vh] w-240 max-w-full overflow-hidden p-0 sm:max-w-full md:max-w-[90vw]'>
				<CredenzaHeader className='sr-only'>
					<CredenzaTitle>{t("settings")}</CredenzaTitle>
					<CredenzaDescription>{t("settings")}</CredenzaDescription>
				</CredenzaHeader>
				{isMobile ? <MobileSettings tabs={tabs} /> : <DesktopSettings tabs={tabs} />}
			</CredenzaContent>
		</Credenza>
	);
};
