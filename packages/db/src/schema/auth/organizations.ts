import { index, pgTable, text } from "drizzle-orm/pg-core";

import { timeFields } from "../helpers/time.ts";

export const organizations = pgTable(
	"organizations",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		slug: text("slug"),
		logo: text("logo"),
		metadata: text("metadata"),
		...timeFields,
	},
	(table) => [index("organization_slug_idx").on(table.slug)]
);

// Types
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
