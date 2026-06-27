import { webSearch } from "@exalabs/ai-sdk";
import type { Tool } from "ai";

import { composeEmailTool } from "./compose-email";
import { createContactTool } from "./create-contact";
import { getContactTool } from "./get-contact";
import { getContactsTool } from "./get-contacts";
import { getKnowledgeContentTool } from "./get-knowledge-content";
import { retrieveKnowledgeTool } from "./retrieve-knowledge";

export { composeEmailTool } from "./compose-email";
export { createContactTool } from "./create-contact";
export { getContactTool } from "./get-contact";
export { getContactsTool } from "./get-contacts";
export { getKnowledgeContentTool } from "./get-knowledge-content";
export { retrieveKnowledgeTool } from "./retrieve-knowledge";

export const dashboardChatTools = {
	composeEmail: composeEmailTool,
	createContact: createContactTool,
	getContact: getContactTool,
	getContacts: getContactsTool,
	getKnowledgeContent: getKnowledgeContentTool,
	retrieveKnowledge: retrieveKnowledgeTool,
	// `@exalabs/ai-sdk` resolves its own copy of `ai` (with zod v3), so its
	// returned `Tool` type is structurally incompatible with our local `ai`'s
	// `ToolSet`. Cast to the local `Tool` type to reconcile the two copies.
	webSearch: webSearch({
		numResults: 10,
		contents: {
			highlights: true,
			text: { maxCharacters: 1200 },
		},
	}) as unknown as Tool<{ query: string }, unknown>,
};
