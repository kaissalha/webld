import { count, type SQL } from "drizzle-orm";
import type { PgSelect, PgTable } from "drizzle-orm/pg-core";

import { db } from "../index.ts";

export const withPagination = <T extends PgSelect>({
	query,
	pageSize,
	offset,
}: {
	query: T;
	pageSize: number;
	offset: number;
}) => {
	return query.limit(pageSize).offset(offset);
};

export const queryWithPagination = async <T extends PgSelect & { execute: () => Promise<unknown[]> }>({
	query,
	model,
	pageSize,
	cursor,
	whereCondition,
}: {
	query: T;
	model: PgTable;
	pageSize: number;
	cursor: string | null;
	whereCondition: SQL;
}) => {
	const parsedOffset = cursor ? Number.parseInt(cursor, 10) : 0;
	const offset = Number.isFinite(parsedOffset) && parsedOffset > 0 ? parsedOffset : 0;
	const safePageSize = pageSize > 0 ? pageSize : 10;

	withPagination({ query, pageSize: safePageSize, offset });

	const countQuery = db.select({ count: count() }).from(model).where(whereCondition);

	const [[{ count: totalData }], data] = await Promise.all([countQuery.execute(), query.execute()]);

	const nextCursor = data.length === safePageSize ? (offset + safePageSize).toString() : undefined;

	return {
		data: data as Awaited<ReturnType<T["execute"]>>,
		meta: {
			totalData,
			totalPages: safePageSize > 0 ? Math.ceil(totalData / safePageSize) : 0,
			cursor: nextCursor ?? null,
		},
	};
};
