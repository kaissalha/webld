import { useCallback, useState } from "react";

type UseMobileSearchProps = {
	onSearchChange: (value: string) => void;
};

export const useMobileSearch = ({ onSearchChange }: UseMobileSearchProps) => {
	const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

	const handleMobileSearchOpen = useCallback(() => {
		setIsMobileSearchOpen(true);
	}, []);

	const handleMobileSearchClose = useCallback(() => {
		setIsMobileSearchOpen(false);
		onSearchChange("");
	}, [onSearchChange]);

	return {
		isMobileSearchOpen,
		handleMobileSearchOpen,
		handleMobileSearchClose,
	};
};
