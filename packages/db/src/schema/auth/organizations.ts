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
		stripeCustomerId: text("stripe_customer_id"),
		...timeFields,
	},
	(table) => [
		index("organization_slug_idx").on(table.slug),
		index("organization_stripe_customer_id_idx").on(table.stripeCustomerId),
	]
);

// Types
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
