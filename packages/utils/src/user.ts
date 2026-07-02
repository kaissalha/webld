const getInitials = ({ name, length = 2 }: { name: string | null; length?: 1 | 2 }) => {
	if (!name) return null;

	const nameParts = name.trim().split(" ");

	if (nameParts.length === 0) return null;
	if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();

	const firstInitial = nameParts[0].charAt(0);

	if (length === 1) return firstInitial;

	const lastInitial = nameParts[nameParts.length - 1].charAt(0);

	return `${firstInitial}${lastInitial}`.toUpperCase();
};

const getPersonInitials = ({
	name,
	email,
	length = 2,
	emptyLabel = "?",
}: {
	name?: string | null;
	email?: string | null;
	length?: 1 | 2;
	emptyLabel?: string;
}) => {
	const source = name?.trim() || email?.trim();

	if (!source) {
		return emptyLabel;
	}

	const parts = source.split(/\s+/).filter(Boolean);

	if (parts.length >= 2) {
		const firstInitial = parts[0].charAt(0);
		const lastInitial = parts[parts.length - 1].charAt(0);

		if (length === 1) {
			return firstInitial.toUpperCase();
		}

		return `${firstInitial}${lastInitial}`.toUpperCase();
	}

	if (length === 1) {
		return parts[0].charAt(0).toUpperCase();
	}

	return source.slice(0, 2).toUpperCase();
};

export const user = {
	getInitials,
	getPersonInitials,
};
