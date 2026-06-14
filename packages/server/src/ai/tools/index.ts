import { composeEmailTool } from "./compose-email";
import { createContactTool } from "./create-contact";
import { getContactTool } from "./get-contact";
import { getContactsTool } from "./get-contacts";
import { listCalendarEventsTool } from "./list-calendar-events";
import { retrieveKnowledgeTool } from "./retrieve-knowledge";
import { searchMailThreadsTool } from "./search-mail-threads";

export { composeEmailTool } from "./compose-email";
export { createContactTool } from "./create-contact";
export { getContactTool } from "./get-contact";
export { getContactsTool } from "./get-contacts";
export { listCalendarEventsTool } from "./list-calendar-events";
export { retrieveKnowledgeTool } from "./retrieve-knowledge";
export { searchMailThreadsTool } from "./search-mail-threads";

export const dashboardChatTools = {
	composeEmail: composeEmailTool,
	createContact: createContactTool,
	getContact: getContactTool,
	getContacts: getContactsTool,
	searchMailThreads: searchMailThreadsTool,
	listCalendarEvents: listCalendarEventsTool,
	retrieveKnowledge: retrieveKnowledgeTool,
};
