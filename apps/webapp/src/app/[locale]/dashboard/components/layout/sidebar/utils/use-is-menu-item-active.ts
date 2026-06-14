import { useCallback } from "react";

import { usePathname } from "@/i18n/navigation";

export const useIsMenuItemActive = () => {
	const pathname = usePathname();

	const isMenuItemActive = useCallback(
		(itemUrl: string, exactMatch = false) => {
			if (exactMatch && pathname !== itemUrl) return false;
			return pathname.startsWith(itemUrl);
		},
		[pathname]
	);

	// Allows sub-routes to be matched unless exactMatch is true
	return {
		isMenuItemActive,
	};
};
