import { type SQL, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

export const buildSearchQuery = (input: string) => {
	// Strip tsquery syntax characters so raw user text can't produce an invalid query.
	const terms = input
		.trim()
		.split(/\s+/)
		.map((term) => term.replaceAll(/[^\p{L}\p{N}]/gu, ""))
		.filter(Boolean);

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
