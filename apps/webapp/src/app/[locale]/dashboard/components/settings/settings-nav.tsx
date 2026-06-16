"use client";

import { LogOutIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useSettings } from "@/hooks/use-settings";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { cn } from "@webld/ui/lib/utils";

import type { SettingsTabConfig } from "./settings-tabs";

type SettingsNavProps = {
	tabs: SettingsTabConfig[];
};

export const SettingsNav = ({ tabs }: SettingsNavProps) => {
	const [activeSetting, setActiveSetting] = useSettings();
	const t = useTranslations("account");
	const router = useRouter();

	const handleSignOut = async () => {
		await authClient.signOut();
		router.push("/login");
	};

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
