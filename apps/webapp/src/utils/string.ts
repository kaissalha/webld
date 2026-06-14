export const capitalize = (str: string): string => {
	return str
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");
};

export const getInitials = ({ name, length = 2 }: { name: string | null; length?: 1 | 2 }) => {
	if (!name) return null;

	const nameParts = name.trim().split(" ");

	if (nameParts.length === 0) return null;
	if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();

	// Get first initial from first part of the name
	const firstInitial = nameParts[0].charAt(0);

	if (length === 1) return firstInitial;

	// Get last initial from the last part of the name
	const lastInitial = nameParts[nameParts.length - 1].charAt(0);

	return `${firstInitial}${lastInitial}`.toUpperCase();
};

export const getFullName = ({ firstName, lastName }: { firstName?: string | null; lastName?: string | null }) => {
	const names = [firstName, lastName].filter(Boolean);
	return names.join(" ");
};
