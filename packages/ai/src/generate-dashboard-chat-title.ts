import { generateText } from "ai";

import { models } from "./models";
import { dashboardChatTitlePrompt } from "./prompts";

export const generateDashboardChatTitle = async ({ message }: { message: string }) => {
	const { text } = await generateText({
		...models.cheapFast,
		reasoning: "none",
		prompt: dashboardChatTitlePrompt({ message }),
	});

	return text
		.trim()
		.replace(/^["'`]+/u, "")
		.replace(/["'`.!?,;:\s]+$/u, "");
};
