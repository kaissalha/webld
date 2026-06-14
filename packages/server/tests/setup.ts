import { afterAll, vi } from "vitest";

process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "test-stripe-key";
process.env.ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY ?? "test-assembly-key";
process.env.RESEND_KEY = process.env.RESEND_KEY ?? "test-resend-key";
process.env.DUB_API_KEY = process.env.DUB_API_KEY ?? "test-dub-key";
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "test-google-client-secret";
process.env.GOOGLE_MAPS_BACKEND_KEY = process.env.GOOGLE_MAPS_BACKEND_KEY ?? "test-google-maps-key";

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
