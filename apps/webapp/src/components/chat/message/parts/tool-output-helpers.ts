export const DATA_TOOL_NAMES = new Set(["getContact", "getContacts", "searchMailThreads", "listCalendarEvents"]);

export const formatToolName = (name: string) => {
	const withSpaces = name.replace(/([A-Z])/g, " $1").trim();
	return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};
