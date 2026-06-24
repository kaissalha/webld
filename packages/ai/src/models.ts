import { devToolsMiddleware } from "@ai-sdk/devtools";
import type { ProviderOptions } from "@ai-sdk/provider-utils";
import type { EmbeddingModel, LanguageModel } from "ai";
import { gateway, wrapLanguageModel } from "ai";

type ModelConfig = {
	model: LanguageModel;
	providerOptions?: ProviderOptions;
};

type ModelRegistry = {
	[key: string]: ModelConfig;
};

type EmbeddingModelRegistry = {
	[key: string]: {
		dimensions: number;
		model: EmbeddingModel;
		modelId: string;
	};
};

const middleware = process.env.NODE_ENV === "development" ? [devToolsMiddleware()] : [];

const createModel = ({
	modelId,
	providerOptions,
}: {
	modelId: string;
	providerOptions?: ProviderOptions;
}): ModelConfig => ({
	model: wrapLanguageModel({
		model: gateway(modelId),
		middleware,
	}),
	providerOptions,
});

export const models = {
	fast: createModel({
		modelId: "deepseek/deepseek-v4-flash",
		providerOptions: {
			gateway: {
				models: ["google/gemini-2.5-flash"],
			},
		},
	}),
	rerank: createModel({
		modelId: "google/gemini-3.1-flash-lite",
	}),
} satisfies ModelRegistry;

export const embeddingModels: EmbeddingModelRegistry = {
	rag: {
		dimensions: 1536,
		model: gateway.embeddingModel("google/gemini-embedding-2"),
		modelId: "google/gemini-embedding-2",
	},
};
