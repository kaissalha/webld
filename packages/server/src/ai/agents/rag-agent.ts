import { stepCountIs, ToolLoopAgent } from "ai";
import { z } from "zod";

import { models } from "@starter/ai/models";
import { ragAnswerSystemPrompt } from "@starter/ai/prompts";

import { retrieveKnowledgeTool } from "../tools";
import { appContextSchema } from "../types";

export const ragAgent = new ToolLoopAgent({
	model: models.fast.model,
	tools: {
		retrieveKnowledge: retrieveKnowledgeTool,
	},
	callOptionsSchema: z
		.object({
			aiContext: appContextSchema.optional(),
		})
		.strict(),
	prepareCall: async ({ options, ...settings }) => {
		return {
			...settings,
			instructions: ragAnswerSystemPrompt,
			experimental_context: options.aiContext,
		};
	},
	stopWhen: stepCountIs(20),
});
