import { vi } from "vitest";

// Mock PostHog client instance
const mockPostHogClient = {
	init: vi.fn(),
	identify: vi.fn(),
	capture: vi.fn(),
	captureException: vi.fn(),
	reset: vi.fn(),
	group: vi.fn(),
	set_config: vi.fn(),
};

// Mock posthog-js
vi.mock("posthog-js", () => ({
	default: mockPostHogClient,
	posthog: mockPostHogClient,
}));

export const mockUseFeatureFlagEnabled = vi.fn(() => false);
export const mockUseFeatureFlag = mockUseFeatureFlagEnabled;
export const mockUsePostHog = vi.fn(() => mockPostHogClient);
export const mockPostHogMiddleware = vi.fn(({ response }: { response?: unknown } = {}) => {
	return vi.fn(async () => response);
});

vi.mock("posthog-js/react", () => ({
	useFeatureFlagEnabled: mockUseFeatureFlagEnabled,
	usePostHog: mockUsePostHog,
	PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock PostHog server instance
const mockPostHogServer = {
	capture: vi.fn(),
	captureException: vi.fn(),
	flush: vi.fn(() => Promise.resolve()),
	getAllFlagsAndPayloads: vi.fn(() => Promise.resolve({ featureFlags: {}, featureFlagPayloads: {} })),
	getContext: vi.fn(() => ({ distinctId: "test-distinct-id" })),
};

// Mock @flags-sdk/posthog
export const mockPostHogAdapter = {
	isFeatureEnabled: vi.fn(() => ({
		decide: vi.fn(() => false),
	})),
	featureFlagValue: vi.fn(() => ({
		decide: vi.fn(() => "control"),
	})),
	featureFlagPayload: vi.fn(() => ({
		decide: vi.fn(() => undefined),
	})),
};

vi.mock("@flags-sdk/posthog", () => ({
	createPostHogAdapter: vi.fn(() => mockPostHogAdapter),
	getProviderData: vi.fn(() => Promise.resolve({})),
}));

export const mockGetPostHog = vi.fn(() => Promise.resolve(mockPostHogServer));

vi.mock("@posthog/next", () => ({
	getPostHog: mockGetPostHog,
	postHogMiddleware: mockPostHogMiddleware,
	PostHogFeature: ({ children }: { children: React.ReactNode }) => children,
	PostHogPageView: () => null,
	PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
	useActiveFeatureFlags: vi.fn(() => []),
	useFeatureFlag: mockUseFeatureFlag,
	usePostHog: mockUsePostHog,
}));

// Mock server PostHog utilities
export const mockGetPostHogServer = vi.fn(() => Promise.resolve(mockPostHogServer));
export const mockGetPostHogDistinctIdFromHeaders = vi.fn(() =>
	Promise.resolve({ distinctId: "test-distinct-id", posthogSessionId: "test-session-id" })
);
export const mockIdentify = vi.fn(() =>
	Promise.resolve({ distinctId: "test-distinct-id", posthogSessionId: "test-session-id" })
);

vi.mock("@/lib/server/posthog", () => ({
	getPostHogServer: mockGetPostHogServer,
	getPostHogDistinctIdFromHeaders: mockGetPostHogDistinctIdFromHeaders,
	preFetchedPostHogAdapter: mockPostHogAdapter,
	identify: mockIdentify,
}));

// Mock client PostHog helpers
vi.mock("@/lib/posthog", () => ({
	PostHogClientEffects: () => null,
}));

// Export mock instances for test assertions
export { mockPostHogClient, mockPostHogServer };
