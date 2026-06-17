import { isStepCount, ToolLoopAgent } from "ai";
import { z } from "zod";

import { models } from "@webld/ai/models";
import { ragAnswerSystemPrompt } from "@webld/ai/prompts";

import { getKnowledgeContentTool, retrieveKnowledgeTool } from "../tools";
import { appContextSchema } from "../types";

export const ragAgent = new ToolLoopAgent({
	model: models.fast.model,
	tools: {
		getKnowledgeContent: getKnowledgeContentTool,
		retrieveKnowledge: retrieveKnowledgeTool,
	},
	toolsContext: {
		getKnowledgeContent: {},
		retrieveKnowledge: {},
	},
	callOptionsSchema: z
		.object({
			aiContext: appContextSchema.optional(),
		})
		.strict(),
	prepareCall: async ({ options, ...settings }) => {
		const aiContext = options.aiContext ?? {};

		return {
			...settings,
			instructions: ragAnswerSystemPrompt,
			runtimeContext: aiContext,
			toolsContext: {
				getKnowledgeContent: aiContext,
				retrieveKnowledge: aiContext,
			},
		};
	},
	stopWhen: isStepCount(20),
});
