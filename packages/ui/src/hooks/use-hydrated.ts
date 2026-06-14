import { useEffect, useState } from "react";

/**
 * useHydrated returns true once the component is mounted on the client.
 * Useful for avoiding hydration mismatches when reading from client-only state (e.g., localStorage).
 */
export const useHydrated = () => {
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		setHydrated(true);
	}, []);

	return hydrated;
};
