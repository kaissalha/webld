import { afterAll } from "vitest";

// Automatically cleanup after each test
afterAll(() => {
	console.log("Cleaning up after all tests");
});
