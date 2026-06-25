import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const devToolsMiddlewareMock = vi.fn(() => "devtools-middleware");
const gatewayEmbeddingModelMock = vi.fn((model: string) => ({ embeddingModel: model }));
const gatewayMock = Object.assign(
	vi.fn((model: string) => ({ model })),
	{
		embeddingModel: gatewayEmbeddingModelMock,
	}
);
const wrapLanguageModelMock = vi.fn(({ middleware, model }: { middleware: unknown[]; model: unknown }) => ({
	middleware,
	model,
}));

vi.mock("@ai-sdk/devtools", () => {
	return {
		devToolsMiddleware: devToolsMiddlewareMock,
	};
});

vi.mock("ai", () => {
	return {
		gateway: gatewayMock,
		wrapLanguageModel: wrapLanguageModelMock,
	};
});

describe("models", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	afterEach(() => {
		delete process.env.NODE_ENV;
	});

	it("enables devtools middleware in development", async () => {
		process.env.NODE_ENV = "development";

		const { embeddingModels, models } = await import("../src/models");

		expect(gatewayMock.mock.calls).toEqual([
			["deepseek/deepseek-v4-flash"],
			["google/gemini-3-flash"],
			["google/gemini-3-flash"],
			["google/gemini-3-flash"],
		]);
		expect(gatewayEmbeddingModelMock).toHaveBeenCalledWith("google/gemini-embedding-2");
		expect(devToolsMiddlewareMock).toHaveBeenCalledTimes(1);
		expect(wrapLanguageModelMock).toHaveBeenNthCalledWith(1, {
			middleware: ["devtools-middleware"],
			model: { model: "deepseek/deepseek-v4-flash" },
		});
		expect(models.cheapFast.model).toEqual({
			middleware: ["devtools-middleware"],
			model: { model: "deepseek/deepseek-v4-flash" },
		});
		expect(models.fast.model).toEqual({
			middleware: ["devtools-middleware"],
			model: { model: "google/gemini-3-flash" },
		});
		expect(embeddingModels.rag).toEqual({
			dimensions: 1536,
			model: { embeddingModel: "google/gemini-embedding-2" },
			modelId: "google/gemini-embedding-2",
		});
	});

	it("omits devtools middleware outside development", async () => {
		process.env.NODE_ENV = "test";

		const { embeddingModels, models } = await import("../src/models");

		expect(devToolsMiddlewareMock).not.toHaveBeenCalled();
		expect(gatewayEmbeddingModelMock).toHaveBeenCalledWith("google/gemini-embedding-2");
		expect(wrapLanguageModelMock).toHaveBeenNthCalledWith(1, {
			middleware: [],
			model: { model: "deepseek/deepseek-v4-flash" },
		});
		expect(models.cheapFast.model).toEqual({
			middleware: [],
			model: { model: "deepseek/deepseek-v4-flash" },
		});
		expect(embeddingModels.rag.dimensions).toBe(1536);
	});
});
