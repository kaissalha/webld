import { stepCountIs, ToolLoopAgent } from "ai";
import { z } from "zod";

import { models } from "@starter/ai/models";
import { dashboardChatSystemPrompt } from "@starter/ai/prompts";

import { dashboardChatTools } from "../tools";
import { appContextSchema } from "../types";

export const dashboardChatAgent = new ToolLoopAgent({
	model: models.fast.model,
	tools: dashboardChatTools,
	callOptionsSchema: z
		.object({
			aiContext: appContextSchema.optional(),
		})
		.strict(),
	prepareCall: async ({ options, ...settings }) => {
		return {
			...settings,
			instructions: dashboardChatSystemPrompt({
				currentUser: options.aiContext?.currentUser,
			}),
			experimental_context: options.aiContext,
		};
	},
	stopWhen: stepCountIs(20),
});
