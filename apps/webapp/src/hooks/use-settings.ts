"use client";

import { useCallback } from "react";

import { createParser, useQueryState } from "nuqs";
import { z } from "zod";

import { useIsMobile } from "@starter/ui/hooks/use-mobile";

const SettingsSchema = z.enum(["list", "profile", "organization", "team", "security", "subscription"]);

export type Settings = z.infer<typeof SettingsSchema>;

const parseAsSettings = createParser({
	parse: (value: string | null) => {
		if (!value) return null;
		const result = SettingsSchema.safeParse(value);
		return result.success ? result.data : null;
	},
	serialize: (value: Settings | null) => value ?? "",
});

export const useSettings = () => {
	const isMobile = useIsMobile();
	const [settings, setSettings] = useQueryState("settings", parseAsSettings);

	const setActiveSetting = useCallback(
		(setting: Settings | null) => {
			// On desktop, "list" has no meaning — default to profile tab
			if (setting === "list" && !isMobile) {
				setSettings("profile");
				return;
			}
			setSettings(setting);
		},
		[isMobile, setSettings]
	);

	return [settings, setActiveSetting] as const;
};
