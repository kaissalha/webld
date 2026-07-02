import { isStepCount, ToolLoopAgent } from "ai";
import { z } from "zod";

import { models } from "@webld/ai/models";
import { dashboardChatSystemPrompt } from "@webld/ai/prompts";

import { dashboardChatTools } from "../tools";
import { appContextSchema } from "../types";

export const dashboardChatAgent = new ToolLoopAgent({
	...models.cheapFast,
	tools: dashboardChatTools,
	toolsContext: {
		composeEmail: {},
		getKnowledgeContent: {},
		recallChatHistory: {},
		retrieveKnowledge: {},
	},
	callOptionsSchema: z
		.object({
			aiContext: appContextSchema.optional(),
			// Once a chat contains an image, run every turn on the vision model so the
			// model can actually read the attached image(s) sent inline.
			useVisionModel: z.boolean().optional(),
		})
		.strict(),
	prepareCall: async ({ options, ...settings }) => {
		const aiContext = options.aiContext ?? {};
		const modelConfig = options.useVisionModel ? models.vision : models.cheapFast;

		return {
			...settings,
			model: modelConfig.model,
			providerOptions: modelConfig.providerOptions,
			// Per-turn context (memories, related chats, knowledge) is injected at the
			// tail of the message list by the route, NOT here: instructions are the
			// first prompt tokens, and changing them busts provider prompt caching
			// for the whole conversation. Only stable-per-chat content belongs here.
			instructions: [
				dashboardChatSystemPrompt({
					currentUser: aiContext.currentUser,
				}),
				aiContext.blocksContext,
			]
				.filter(Boolean)
				.join("\n\n"),
			runtimeContext: aiContext,
			toolsContext: {
				composeEmail: aiContext,
				getKnowledgeContent: aiContext,
				recallChatHistory: aiContext,
				retrieveKnowledge: aiContext,
			},
		};
	},
	stopWhen: isStepCount(20),
});
