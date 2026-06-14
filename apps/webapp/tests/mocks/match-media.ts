import { vi } from "vitest";

// Mock window.matchMedia
const mockMatchMedia = vi.fn().mockImplementation((query) => ({
	matches: false,
	media: query,
	onchange: null,
	addListener: vi.fn(),
	removeListener: vi.fn(),
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	dispatchEvent: vi.fn(),
}));

// Add matchMedia to window
vi.stubGlobal("matchMedia", mockMatchMedia);
