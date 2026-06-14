import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/hooks/use-breakpoint", () => ({
	useBreakpoint: vi.fn(),
}));

import { useBreakpoint } from "../../src/hooks/use-breakpoint";
import { useIsMobile } from "../../src/hooks/use-mobile";

describe("useIsMobile", () => {
	it("returns true when breakpoint is below md", () => {
		vi.mocked(useBreakpoint).mockReturnValue(false);

		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(true);
	});

	it("returns false when breakpoint is md or above", () => {
		vi.mocked(useBreakpoint).mockReturnValue(true);

		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(false);
	});
});
