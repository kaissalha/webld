import { index, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { organizations } from "../auth/organizations.ts";
import { timeFields } from "../helpers/time.ts";

export const uploadedMediaAccess = pgEnum("uploaded_media_access", ["public", "private"]);

export const uploadedMediaAccessValues = uploadedMediaAccess.enumValues;

export const uploadedMedia = pgTable(
	"uploaded_media",
	{
		id: uuid("id").primaryKey().notNull().defaultRandom(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		url: text("url").notNull(),
		contentType: text("content_type").notNull(),
		access: uploadedMediaAccess("access").default("public").notNull(),
		...timeFields,
	},
	(table) => [
		index("uploaded_media_organization_id_idx").on(table.organizationId),
		index("uploaded_media_url_idx").on(table.url),
		index("uploaded_media_created_at_idx").on(table.createdAt),
	]
);

export type UploadedMedia = typeof uploadedMedia.$inferSelect;
export type NewUploadedMedia = typeof uploadedMedia.$inferInsert;
export type UploadedMediaAccess = (typeof uploadedMediaAccessValues)[number];
