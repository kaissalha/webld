import { vi } from "vitest";

// Mock next/server's after function to avoid "called outside request scope" errors in tests
vi.mock("next/server", async () => {
	const actual = await vi.importActual<typeof import("next/server")>("next/server");
	return {
		...actual,
		after: vi.fn((callback) => {
			// Execute the callback immediately in tests
			if (typeof callback === "function") {
				Promise.resolve().then(callback);
			}
		}),
	};
});
