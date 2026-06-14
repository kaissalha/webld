import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { timeFields } from "./helpers/time.ts";

export const subscriptions = pgTable(
	"subscriptions",
	{
		id: text("id").primaryKey(),
		plan: text("plan").notNull(),
		referenceId: text("reference_id").notNull(),
		stripeCustomerId: text("stripe_customer_id"),
		stripeSubscriptionId: text("stripe_subscription_id"),
		status: text("status").notNull().default("incomplete"),
		periodStart: timestamp("period_start", { withTimezone: true, mode: "string" }),
		periodEnd: timestamp("period_end", { withTimezone: true, mode: "string" }),
		trialStart: timestamp("trial_start", { withTimezone: true, mode: "string" }),
		trialEnd: timestamp("trial_end", { withTimezone: true, mode: "string" }),
		cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
		cancelAt: timestamp("cancel_at", { withTimezone: true, mode: "string" }),
		canceledAt: timestamp("canceled_at", { withTimezone: true, mode: "string" }),
		endedAt: timestamp("ended_at", { withTimezone: true, mode: "string" }),
		seats: integer("seats"),
		billingInterval: text("billing_interval"),
		stripeScheduleId: text("stripe_schedule_id"),
		...timeFields,
	},
	(table) => [
		index("subscription_reference_id_idx").on(table.referenceId),
		index("subscription_stripe_customer_id_idx").on(table.stripeCustomerId),
		index("subscription_stripe_subscription_id_idx").on(table.stripeSubscriptionId),
		index("subscription_status_idx").on(table.status),
	]
);

// Types
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
