import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useHydrated } from "../../src/hooks/use-hydrated";

describe("useHydrated", () => {
	it("returns true after hydration", async () => {
		const { result } = renderHook(() => useHydrated());

		await waitFor(() => {
			expect(result.current).toBe(true);
		});
	});
});
