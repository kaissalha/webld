"use client";

import type { ComponentType, FC } from "react";

import { Building2Icon, ShieldIcon, UserIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Settings } from "@/hooks/use-settings";

import { OrganizationTab } from "./organization-tab";
import { ProfileTab } from "./profile-tab";
import { SecurityTab } from "./security-tab";

export type SettingsTabConfig = {
	name: Exclude<Settings, "list">;
	label: string;
	icon: ComponentType<{ className?: string }>;
	component: FC;
};

export const useSettingsTabs = () => {
	const t = useTranslations("settings");

	return [
		{ name: "profile", label: t("tabs.profile"), icon: UserIcon, component: ProfileTab },
		{ name: "organization", label: t("tabs.organization"), icon: Building2Icon, component: OrganizationTab },
		{ name: "security", label: t("tabs.security"), icon: ShieldIcon, component: SecurityTab },
	] satisfies SettingsTabConfig[];
};
