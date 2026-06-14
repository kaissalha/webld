import { type SQL, sql } from "drizzle-orm";
import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { organizations } from "../auth/organizations.ts";
import { timeFields } from "../helpers/time.ts";
import { tsvector } from "../helpers/tsvector.ts";

export const notes = pgTable(
	"notes",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		body: text("body").notNull(),
		...timeFields,
		fts: tsvector("fts")
			.notNull()
			.generatedAlwaysAs((): SQL => sql`to_tsvector('english'::regconfig, COALESCE(${notes.body}, ''))`),
	},
	(table) => [
		index("note_organization_id_idx").on(table.organizationId),
		index("idx_notes_fts").using("gin", table.fts.asc().nullsLast().op("tsvector_ops")),
	]
);

export type Note = typeof notes.$inferSelect;
export type NoteNew = typeof notes.$inferInsert;
