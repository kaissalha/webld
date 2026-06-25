import type { ModelMessage } from "ai";
import { healMessages, type HealOptions, type Provider, type Repair } from "ai-sdk-heal";

export type { HealOptions, HealResult, Provider as HealProvider, Repair as MessageRepair } from "ai-sdk-heal";
export { healMessages, inferProvider, validateMessages } from "ai-sdk-heal";

export type HealedModelMessages = {
	messages: ModelMessage[];
	repairs: Repair[];
};

export const healProviderForModelId = (modelId: string): Provider | undefined => {
	const provider = modelId.split("/")[0];

	if (provider === "google") {
		return "google";
	}

	if (provider === "anthropic") {
		return "anthropic";
	}

	if (provider === "openai") {
		return "openai";
	}

	return undefined;
};

type HealMessagesInput = Parameters<typeof healMessages>[0];

export const healModelMessages = (messages: ModelMessage[], options?: HealOptions): HealedModelMessages => {
	const result = healMessages(messages as HealMessagesInput, options);

	return {
		messages: result.messages as ModelMessage[],
		repairs: result.repairs,
	};
};
