import { varchar } from "drizzle-orm/pg-core";

export const locationFields = {
	address: varchar("address", { length: 255 }).notNull(),
	city: varchar("city", { length: 100 }).notNull(),
	state: varchar("state", { length: 100 }),
	countryCode: varchar("country_code", { length: 2 }).notNull(),
	postalCode: varchar("postal_code", { length: 20 }),
	timezone: varchar("timezone", { length: 100 }).notNull(),
};
