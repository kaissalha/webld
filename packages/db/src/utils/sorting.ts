import { asc, desc, getColumns, type SQL } from "drizzle-orm";
import type { PgSelect, PgTable } from "drizzle-orm/pg-core";

export const withOrderBy = <T extends PgSelect, M extends PgTable>({
	query,
	model,
	orderBy,
	order,
	joinedColumns = {},
}: {
	query: T;
	model: M;
	orderBy: string | undefined;
	order: "asc" | "desc" | undefined;
	joinedColumns: Record<string, SQL>;
}) => {
	if (!orderBy) return query;

	// 1. Try to match a column on the base table first
	const baseColumns = getColumns(model);
	if (orderBy in baseColumns) {
		const column = baseColumns[orderBy as keyof typeof baseColumns];
		query.orderBy(order === "desc" ? desc(column) : asc(column));
		return query;
	}

	// 2. Fallback to joined / virtual columns map
	if (orderBy in joinedColumns) {
		const columnExpr = joinedColumns[orderBy];

		query.orderBy(order === "desc" ? desc(columnExpr) : asc(columnExpr));
	}

	return query;
};
