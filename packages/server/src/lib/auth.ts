import { expo } from "@better-auth/expo";
import { redisStorage } from "@better-auth/redis-storage";
import { waitUntil } from "@vercel/functions";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, organization, twoFactor } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { render } from "react-email";
import { v4 as uuidv4 } from "uuid";

import { createTCPRedisClient } from "@webld/cache";
import { db, members, organizations } from "@webld/db";
import * as schema from "@webld/db/schema";
import { InvitationEmail, OtpEmail } from "@webld/email";
import { logger } from "@webld/logger/server";
import { url } from "@webld/utils";

import { resend } from "./resend";

if (!db) {
	throw new Error("Database not found");
}

if (!process.env.REDIS_URL) {
	throw new Error("REDIS_URL is not set");
}

const redis = createTCPRedisClient(process.env.REDIS_URL);

export const auth = betterAuth({
	appName: "webld",
	debug: true,
	baseURL: url.getBaseURL().toString(),
	trustedOrigins: [url.getBaseURL().toString(), "webld-mobile://", "mobile://"],
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
			async sendInvitationEmail({ id, email, role, organization, inviter }) {
				const inviteLink = new URL(`/accept-invitation/${id}`, url.getBaseURL()).toString();
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
