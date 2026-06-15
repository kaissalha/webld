import { devToolsMiddleware } from "@ai-sdk/devtools";
import type { EmbeddingModel, LanguageModel } from "ai";
import { gateway, wrapLanguageModel } from "ai";

type ModelRegistry = {
	[key: string]: {
		model: LanguageModel;
	};
};

type EmbeddingModelRegistry = {
	[key: string]: {
		dimensions: number;
		model: EmbeddingModel;
		modelId: string;
	};
};

const middleware = process.env.NODE_ENV === "development" ? [devToolsMiddleware()] : [];

const createModel = ({ modelId }: { modelId: string }) =>
	wrapLanguageModel({
		model: gateway(modelId),
		middleware,
	});

export const models: ModelRegistry = {
	fast: {
		model: createModel({ modelId: "google/gemini-3-flash" }),
	},
};

export const embeddingModels: EmbeddingModelRegistry = {
	rag: {
		dimensions: 1536,
		model: gateway.embeddingModel("google/gemini-embedding-2"),
		modelId: "google/gemini-embedding-2",
	},
};
