import { tool } from "ai";
import { z } from "zod";

import type { AppContext } from "../types";

const NAME_PLACEHOLDER_PATTERN = /\[Your Name\]|\{\{?\s*your[\s_-]*name\s*\}?\}/gi;

export const composeEmailTool = tool({
	description:
		"Draft an email for the user in a structured composer UI. Use this when the user asks to write, draft, or revise an email. Include the recipient address when it is known, and provide a polished subject and body that the user can edit before sending.",
	inputSchema: z.object({
		content: z.string().describe("The plain-text email body with paragraph breaks."),
		title: z.string().describe("The email subject line."),
		to: z.string().optional().describe("The recipient email address when it is known."),
	}),
	outputSchema: z.object({
		address: z.string(),
		content: z.string(),
		title: z.string(),
	}),
	execute: async ({ content, title, to }, { experimental_context }) => {
		const currentUserName = (experimental_context as AppContext | undefined)?.currentUser?.name?.trim();
		const normalizedContent = currentUserName
			? content.replace(NAME_PLACEHOLDER_PATTERN, currentUserName)
			: content
					.replace(NAME_PLACEHOLDER_PATTERN, "")
					.replace(/\n{3,}/g, "\n\n")
					.trimEnd();

		return {
			address: to ?? "",
			content: normalizedContent,
			title,
		};
	},
});
