const formatLocalizedDate = ({ value, locale }: { value?: string | null; locale: string }) => {
	if (!value) {
		return null;
	}

	const parsedDate = new Date(value);

	if (Number.isNaN(parsedDate.getTime())) {
		return null;
	}

	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(parsedDate);
};

export const date = {
	formatLocalizedDate,
};
