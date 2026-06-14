import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { screens, useBreakpoint } from "../../src/hooks/use-breakpoint";

vi.mock("use-media", () => ({
	useMedia: vi.fn(),
}));

import { useMedia } from "use-media";

describe("useBreakpoint", () => {
	it("uses minWidth for the requested breakpoint", () => {
		vi.mocked(useMedia).mockReturnValue(true);

		const { result } = renderHook(() => useBreakpoint("md"));

		expect(useMedia).toHaveBeenCalledWith({ minWidth: `${screens.md}px` });
		expect(result.current).toBe(true);
	});
});
