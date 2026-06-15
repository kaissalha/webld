import { composeEmailTool } from "./compose-email";
import { createContactTool } from "./create-contact";
import { getContactTool } from "./get-contact";
import { getContactsTool } from "./get-contacts";
import { retrieveKnowledgeTool } from "./retrieve-knowledge";

export { composeEmailTool } from "./compose-email";
export { createContactTool } from "./create-contact";
export { getContactTool } from "./get-contact";
export { getContactsTool } from "./get-contacts";
export { retrieveKnowledgeTool } from "./retrieve-knowledge";

export const dashboardChatTools = {
	composeEmail: composeEmailTool,
	createContact: createContactTool,
	getContact: getContactTool,
	getContacts: getContactsTool,
	retrieveKnowledge: retrieveKnowledgeTool,
};
