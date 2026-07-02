export const getInitials = ({ name, length = 2 }: { name: string | null; length?: 1 | 2 }) => {
	if (!name) return null;

	const nameParts = name.trim().split(" ");

	if (nameParts.length === 0) return null;
	if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();

	const firstInitial = nameParts[0].charAt(0);

	if (length === 1) return firstInitial;

	const lastInitial = nameParts[nameParts.length - 1].charAt(0);

	return `${firstInitial}${lastInitial}`.toUpperCase();
};
