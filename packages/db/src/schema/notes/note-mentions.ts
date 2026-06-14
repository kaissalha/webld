import { index, pgEnum, pgTable, uuid } from "drizzle-orm/pg-core";

import { notes } from "./notes.ts";

export const noteMentionResourceType = pgEnum("note_mention_resource_type", ["contact"]);

export const noteMentionResourceTypeEnum = noteMentionResourceType.enumValues;

export type NoteMentionResourceType = (typeof noteMentionResourceTypeEnum)[number];

export const noteMentions = pgTable(
	"note_mentions",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		noteId: uuid("note_id")
			.notNull()
			.references(() => notes.id, { onDelete: "cascade" }),
		resourceType: noteMentionResourceType("resource_type").notNull(),
		resourceId: uuid("resource_id").notNull(),
	},
	(table) => [
		index("note_mention_note_id_idx").on(table.noteId),
		index("note_mention_resource_idx").on(table.resourceType, table.resourceId),
	]
);

export type NoteMention = typeof noteMentions.$inferSelect;
export type NoteMentionNew = typeof noteMentions.$inferInsert;
