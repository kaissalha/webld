import { type SQL, sql } from "drizzle-orm";
import { index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

import { organizations } from "../auth/organizations.ts";
import { timeFields } from "../helpers/time.ts";
import { tsvector } from "../helpers/tsvector.ts";

export const contacts = pgTable(
	"contacts",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		firstName: text("first_name").notNull(),
		lastName: text("last_name").notNull(),
		email: text("email").notNull(),
		phoneNumber: text("phone_number"),
		...timeFields,
		fts: tsvector("fts")
			.notNull()
			.generatedAlwaysAs(
				(): SQL =>
					sql`
						to_tsvector(
							'english'::regconfig,
							COALESCE(${contacts.firstName}, '') || ' ' ||
							COALESCE(${contacts.lastName}, '') || ' ' ||
							COALESCE(${contacts.email}, '') || ' ' ||
							COALESCE(${contacts.phoneNumber}, '')
						)
					`
			),
	},
	(table) => [
		index("contact_organization_id_idx").on(table.organizationId),
		unique("contact_organization_email_idx").on(table.organizationId, table.email),
		index("idx_contacts_fts").using("gin", table.fts.asc().nullsLast().op("tsvector_ops")),
	]
);

export type Contact = typeof contacts.$inferSelect;
