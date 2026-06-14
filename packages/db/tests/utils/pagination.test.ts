import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/index.ts", () => {
	return {
		db: {
			select: vi.fn(),
		},
	};
});

import { db } from "../../src/index.ts";
import { queryWithPagination, withPagination } from "../../src/utils/pagination";

describe("withPagination", () => {
	it("applies limit and offset", () => {
		const limit = vi.fn().mockReturnThis();
		const offset = vi.fn();
		const query = { limit, offset } as unknown as Parameters<typeof withPagination>[0]["query"];

		withPagination({ query, pageSize: 10, offset: 20 });
		expect(limit).toHaveBeenCalledWith(10);
		expect(offset).toHaveBeenCalledWith(20);
	});
});

describe("queryWithPagination", () => {
	it("returns data and pagination metadata", async () => {
		const execute = vi.fn().mockResolvedValue([{ id: "1" }, { id: "2" }]);
		const limit = vi.fn().mockReturnThis();
		const offset = vi.fn().mockReturnThis();
		const query = { limit, offset, execute } as unknown as Parameters<typeof queryWithPagination>[0]["query"];
		const model = {} as Parameters<typeof queryWithPagination>[0]["model"];
		const whereCondition = {} as Parameters<typeof queryWithPagination>[0]["whereCondition"];

		const countExecute = vi.fn().mockResolvedValue([{ count: 5 }]);
		const from = vi.fn().mockReturnThis();
		const where = vi.fn().mockReturnValue({ execute: countExecute });
		vi.mocked(db.select).mockReturnValue({ from, where } as never);

		const result = await queryWithPagination({
			query,
			model,
			pageSize: 2,
			cursor: "2",
			whereCondition,
		});

		expect(result.data).toHaveLength(2);
		expect(result.meta).toEqual({ totalData: 5, totalPages: 3, cursor: "4" });
		expect(countExecute).toHaveBeenCalled();
	});

	it("defaults to offset 0 for invalid cursor", async () => {
		const execute = vi.fn().mockResolvedValue([{ id: "1" }]);
		const limit = vi.fn().mockReturnThis();
		const offset = vi.fn().mockReturnThis();
		const query = { limit, offset, execute } as unknown as Parameters<typeof queryWithPagination>[0]["query"];
		const model = {} as Parameters<typeof queryWithPagination>[0]["model"];
		const whereCondition = {} as Parameters<typeof queryWithPagination>[0]["whereCondition"];

		const countExecute = vi.fn().mockResolvedValue([{ count: 1 }]);
		const from = vi.fn().mockReturnThis();
		const where = vi.fn().mockReturnValue({ execute: countExecute });
		vi.mocked(db.select).mockReturnValue({ from, where } as never);

		await queryWithPagination({
			query,
			model,
			pageSize: 1,
			cursor: "not-a-number",
			whereCondition,
		});

		expect(offset).toHaveBeenCalledWith(0);
	});

	it("uses safe page size when pageSize is 0", async () => {
		const execute = vi.fn().mockResolvedValue([{ id: "1" }]);
		const limit = vi.fn().mockReturnThis();
		const offset = vi.fn().mockReturnThis();
		const query = { limit, offset, execute } as unknown as Parameters<typeof queryWithPagination>[0]["query"];
		const model = {} as Parameters<typeof queryWithPagination>[0]["model"];
		const whereCondition = {} as Parameters<typeof queryWithPagination>[0]["whereCondition"];

		const countExecute = vi.fn().mockResolvedValue([{ count: 1 }]);
		const from = vi.fn().mockReturnThis();
		const where = vi.fn().mockReturnValue({ execute: countExecute });
		vi.mocked(db.select).mockReturnValue({ from, where } as never);

		const result = await queryWithPagination({
			query,
			model,
			pageSize: 0,
			cursor: null,
			whereCondition,
		});

		expect(limit).toHaveBeenCalledWith(10);
		expect(result.meta.totalPages).toBe(1);
	});
});
