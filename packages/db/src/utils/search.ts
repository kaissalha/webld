import { type SQL, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

export const buildSearchQuery = (input: string) => {
	const terms = input.trim().split(/\s+/).filter(Boolean);

	if (terms.length === 0) {
		return "";
	}

	return terms.map((term) => `${term.toLowerCase()}:*`).join(" & ");
};

export const addFullTextSearch = <T extends PgTable>({
	whereConditions,
	model,
	searchTerm,
}: {
	whereConditions: SQL[];
	model: T;
	searchTerm: string | undefined;
}) => {
	if (!searchTerm?.trim()) return;

	const searchQuery = buildSearchQuery(searchTerm);

	if (!("fts" in model)) throw new Error("Model does not have an fts field");

	whereConditions.push(sql`${model.fts} @@ to_tsquery('english', ${searchQuery})`);
};
