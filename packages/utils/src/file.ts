const getExtensionFromFilename = ({ filename, maxLength = 8 }: { filename: string; maxLength?: number }) => {
	const lastDot = filename.lastIndexOf(".");

	if (lastDot <= 0 || lastDot === filename.length - 1) {
		return null;
	}

	return filename.slice(lastDot + 1, lastDot + 1 + maxLength).toLowerCase();
};

const getExtensionFromMediaType = ({ mediaType }: { mediaType: string }) => {
	const normalizedMediaType = mediaType.split(";")[0]?.trim().toLowerCase();

	if (!normalizedMediaType) {
		return "bin";
	}

	const subtype = normalizedMediaType.split("/")[1];

	if (!subtype) {
		return "bin";
	}

	return subtype.split("+")[0] || "bin";
};

const getFileExtension = ({
	filename,
	mediaType = "",
	maxNameExtensionLength = 8,
	fallback = "",
}: {
	filename: string;
	mediaType?: string;
	maxNameExtensionLength?: number;
	fallback?: string;
}) => {
	const fromName = getExtensionFromFilename({ filename, maxLength: maxNameExtensionLength });

	if (fromName) {
		return fromName;
	}

	const subtype =
		mediaType
			.split(";")[0]
			?.trim()
			.toLowerCase()
			.split("/")[1]
			?.replaceAll("+", " ")
			.slice(0, maxNameExtensionLength) ?? "";

	return subtype || fallback;
};

const getDisplayFileExtension = ({ filename, mediaType }: { filename?: string; mediaType: string }) => {
	if (filename) {
		const lastDot = filename.lastIndexOf(".");

		if (lastDot > 0 && lastDot < filename.length - 1) {
			return filename.slice(lastDot + 1).toUpperCase();
		}
	}

	const subtype = mediaType.split("/").pop();

	if (!subtype) {
		return null;
	}

	if (subtype.includes(".")) {
		const tail = subtype.split(".").pop();
		return tail ? tail.toUpperCase() : null;
	}

	if (subtype.length > 8) {
		return null;
	}

	return subtype.toUpperCase();
};

export const file = {
	getDisplayFileExtension,
	getExtensionFromFilename,
	getExtensionFromMediaType,
	getFileExtension,
};
