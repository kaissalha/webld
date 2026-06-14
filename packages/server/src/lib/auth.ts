import { expo } from "@better-auth/expo";
import { redisStorage } from "@better-auth/redis-storage";
import { stripe } from "@better-auth/stripe";
import { waitUntil } from "@vercel/functions";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, organization, twoFactor } from "better-auth/plugins";
import { and, eq } from "drizzle-orm";
import { render } from "react-email";
import { v4 as uuidv4 } from "uuid";

import { createTCPRedisClient } from "@starter/cache";
import { db, members, organizations } from "@starter/db";
import * as schema from "@starter/db/schema";
import { InvitationEmail, OtpEmail } from "@starter/email";
import { logger } from "@starter/logger/server";
import { getBaseURL } from "@starter/utils";

import { resend } from "./resend";
import { stripeClient } from "./stripe";

if (!process.env.STRIPE_WEBHOOK_SECRET) {
	throw new Error("STRIPE_WEBHOOK_SECRET is not set");
}

if (!db) {
	throw new Error("Database not found");
}

if (!process.env.REDIS_URL) {
	throw new Error("REDIS_URL is not set");
}

const redis = createTCPRedisClient(process.env.REDIS_URL);

export const auth = betterAuth({
	appName: "Starter",
	debug: true,
	baseURL: getBaseURL().toString(),
	trustedOrigins: [getBaseURL().toString(), "starter-mobile://", "mobile://"],
	database: drizzleAdapter(db, {
		provider: "pg",
		usePlural: true,
		schema,
	}),
	secondaryStorage: redisStorage({
		client: redis,
	}),
	plugins: [
		expo(),
		twoFactor(),
		organization({
			schema: {
				organization: {
					additionalFields: {
						stripeCustomerId: {
							type: "string",
							required: false,
							fieldName: "stripe_customer_id",
						},
					},
				},
			},
			async sendInvitationEmail({ id, email, role, organization, inviter }) {
				const inviteLink = new URL(`/accept-invitation/${id}`, getBaseURL()).toString();
				const html = await render(
					InvitationEmail({
						inviteLink,
						inviterEmail: inviter.user.email,
						inviterName: inviter.user.name,
						organizationName: organization.name,
						recipientEmail: email,
						role,
						locale: "en",
					})
				);

				const { error } = await resend.emails.send({
					from: "Acme <onboarding@resend.dev>",
					to: [email],
					subject: `You're invited to join ${organization.name}`,
					html,
				});

				if (error) {
					logger.error({
						error,
						message: "Failed to send organization invitation email",
						metadata: {
							email,
							organizationId: organization.id,
							invitationId: id,
							source: "better-auth",
							flow: "organization-invitation",
						},
					});
				}
			},
		}),
		stripe({
			stripeClient,
			stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
			createCustomerOnSignUp: false, // Customers are created per-organization, not per-user
			subscription: {
				enabled: true,
				plans: [
					{
						name: "starter",
						priceId: process.env.STRIPE_STARTER_PRICE_ID,
					},
					{
						name: "pro",
						priceId: process.env.STRIPE_PRO_PRICE_ID,
					},
				],
				authorizeReference: async ({ user, referenceId, action }) => {
					// Check if the user is an owner or admin of the organization
					const [member] = await db
						.select()
						.from(members)
						.where(and(eq(members.organizationId, referenceId), eq(members.userId, user.id)))
						.limit(1)
						.execute();

					if (!member) {
						return false;
					}

					// Allow owners and admins to manage subscriptions
					if (
						action === "upgrade-subscription" ||
						action === "cancel-subscription" ||
						action === "restore-subscription" ||
						action === "billing-portal"
					) {
						return member.role === "owner" || member.role === "admin";
					}

					// Allow all members to list/view subscriptions
					return true;
				},
			},
			organization: {
				enabled: true,
			},
		}),
		emailOTP({
			async sendVerificationOTP({ email, otp }) {
				// Import the OTP email template
				// Render the email
				const html = await render(OtpEmail({ otp, locale: "en" }));

				const { error } = await resend.emails.send({
					from: "Acme <onboarding@resend.dev>",
					to: [email],
					subject: "Your verification code",
					html,
				});

				if (error) {
					logger.error({
						error,
						message: "Failed to send verification OTP",
						metadata: {
							email,
							source: "better-auth",
							flow: "email-otp",
						},
					});
				}
			},
		}),
		nextCookies(),
	], // nextCookies must be the last plugin
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					const id = uuidv4();

					await db.transaction(async (tx) => {
						const [organization] = await tx
							.insert(organizations)
							.values({
								id,
								name: user.name,
								slug: `${user.name.toLowerCase().replace(/\s+/g, "-")}-${id.slice(0, 4)}`,
							})
							.returning();

						await tx.insert(members).values({
							id,
							userId: user.id,
							organizationId: organization.id,
							role: "owner",
						});
					});
				},
			},
		},
		session: {
			create: {
				before: async (session) => {
					const [member] = await db
						.select()
						.from(members)
						.where(eq(members.userId, session.userId))
						.limit(1)
						.execute();

					if (!member) {
						return { data: session };
					}

					return {
						data: {
							...session,
							activeOrganizationId: member?.organizationId,
						},
					};
				},
			},
		},
	},
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60, // Cache duration in seconds
		},
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
			accessType: "offline",
			prompt: "select_account consent",
		},
	},
	advanced: {
		crossSubDomainCookies: {
			enabled: true,
		},
		backgroundTasks: { handler: waitUntil },
	},
	logger: {
		disabled: false,
		disableColors: false,
		log: (level, message, ...args) => {
			const error = args.find(
				(arg) =>
					arg instanceof Error ||
					(typeof arg === "object" && arg !== null && ("message" in arg || "name" in arg || "stack" in arg))
			);
			const details = error ? args.filter((arg) => arg !== error) : args;
			const metadata = {
				source: "better-auth",
				...(details.length ? { details } : {}),
			};

			switch (level) {
				case "error":
					logger.error({
						message,
						metadata,
						error,
					});
					return;
				default:
					logger[level]({
						message,
						metadata,
					});
					return;
			}
		},
	},
});
