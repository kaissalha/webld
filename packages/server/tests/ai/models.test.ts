import { beforeEach, describe, expect, it, vi } from "vitest";

const { wrapLanguageModel, gateway, devToolsMiddleware } = vi.hoisted(() => ({
	wrapLanguageModel: vi.fn().mockReturnValue({ wrapped: true }),
	gateway: Object.assign(vi.fn().mockReturnValue({ id: "model" }), {
		embeddingModel: vi.fn().mockReturnValue({ id: "embedding-model" }),
	}),
	devToolsMiddleware: vi.fn().mockReturnValue("devtools"),
}));

vi.mock("ai", () => ({
	gateway,
	wrapLanguageModel,
}));

vi.mock("@ai-sdk/devtools", () => ({
	devToolsMiddleware,
}));

describe("ai models", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("enables devtools middleware in development", async () => {
		process.env.NODE_ENV = "development";
		vi.resetModules();

		await import("@starter/ai/models");

		expect(devToolsMiddleware).toHaveBeenCalled();
		expect(wrapLanguageModel).toHaveBeenCalled();

		const firstCall = wrapLanguageModel.mock.calls[0]?.[0];
		expect(firstCall.middleware).toEqual(["devtools"]);
	});

	it("disables devtools middleware outside development", async () => {
		process.env.NODE_ENV = "production";
		vi.resetModules();

		await import("@starter/ai/models");

		const firstCall = wrapLanguageModel.mock.calls[0]?.[0];
		expect(firstCall.middleware).toEqual([]);
	});
});
