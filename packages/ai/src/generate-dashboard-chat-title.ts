import { Output, generateText } from "ai";

import { models } from "./models";
import { dashboardChatTitlePrompt, dashboardChatTitleSchema } from "./prompts";

export const generateDashboardChatTitle = async ({ message }: { message: string }) => {
	const { output } = await generateText({
		...models.cheapFast,
		reasoning: "none",
		output: Output.object({
			schema: dashboardChatTitleSchema,
		}),
		prompt: dashboardChatTitlePrompt({ message }),
	});

	return output.title.trim();
};
