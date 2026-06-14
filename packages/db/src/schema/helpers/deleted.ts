import { text, timestamp } from "drizzle-orm/pg-core";

import { users } from "../auth/users";

export const deletedFields = {
	deletedBy: text("deleted_by").references(() => users.id, { onDelete: "cascade" }),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
};
