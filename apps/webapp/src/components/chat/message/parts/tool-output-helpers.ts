export const formatToolName = (name: string) => {
	const withSpaces = name.replace(/([A-Z])/g, " $1").trim();
	return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};
