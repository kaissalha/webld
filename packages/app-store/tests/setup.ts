import { afterAll, vi } from "vitest";

const logger = {
	debug: vi.fn(),
	error: vi.fn(),
	info: vi.fn(),
	log: vi.fn(),
	warn: vi.fn(),
};

vi.mock("@starter/logger/server", () => {
	return {
		createServerLogger: () => logger,
		logger,
	};
});

// Automatically cleanup after each test
afterAll(() => {
	console.log("Cleaning up after all tests");
});
