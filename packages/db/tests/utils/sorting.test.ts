import { describe, expect, it, vi } from "vitest";

const orderByCalls: Array<{ direction: "asc" | "desc"; column: unknown }> = [];

vi.mock("drizzle-orm", async () => {
	const actual = await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");
	return {
		...actual,
		asc: (column: unknown) => {
			orderByCalls.push({ direction: "asc", column });
			return `asc(${String(column)})`;
		},
		desc: (column: unknown) => {
			orderByCalls.push({ direction: "desc", column });
			return `desc(${String(column)})`;
		},
		getColumns: vi.fn(),
	};
});

import { getColumns } from "drizzle-orm";

import { withOrderBy } from "../../src/utils/sorting";

describe("withOrderBy", () => {
	it("applies order to base columns", () => {
		orderByCalls.length = 0;
		const orderByMock = vi.fn();
		const query = { orderBy: orderByMock } as unknown as Parameters<typeof withOrderBy>[0]["query"];
		const table = { name: "name" } as unknown as Parameters<typeof withOrderBy>[0]["model"];

		vi.mocked(getColumns).mockReturnValue({ name: "name" } as never);

		const result = withOrderBy({ query, model: table, orderBy: "name", order: "desc", joinedColumns: {} });

		expect(result).toBe(query);
		expect(orderByCalls).toEqual([{ direction: "desc", column: "name" }]);
		expect(orderByMock).toHaveBeenCalled();
	});

	it("applies order to joined columns", () => {
		orderByCalls.length = 0;
		const orderByMock = vi.fn();
		const query = { orderBy: orderByMock } as unknown as Parameters<typeof withOrderBy>[0]["query"];
		const table = {} as unknown as Parameters<typeof withOrderBy>[0]["model"];
		const joinedColumns = { displayName: "display_name" } as unknown as Parameters<
			typeof withOrderBy
		>[0]["joinedColumns"];

		vi.mocked(getColumns).mockReturnValue({} as never);

		const result = withOrderBy({ query, model: table, orderBy: "displayName", order: "asc", joinedColumns });

		expect(result).toBe(query);
		expect(orderByCalls).toEqual([{ direction: "asc", column: "display_name" }]);
		expect(orderByMock).toHaveBeenCalled();
	});

	it("does not apply order for unknown columns", () => {
		orderByCalls.length = 0;
		const orderByMock = vi.fn();
		const query = { orderBy: orderByMock } as unknown as Parameters<typeof withOrderBy>[0]["query"];
		const table = {} as unknown as Parameters<typeof withOrderBy>[0]["model"];

		vi.mocked(getColumns).mockReturnValue({} as never);

		const result = withOrderBy({
			query,
			model: table,
			orderBy: "unknown",
			order: "asc",
			joinedColumns: {},
		});

		expect(result).toBe(query);
		expect(orderByCalls).toEqual([]);
		expect(orderByMock).not.toHaveBeenCalled();
	});
});
