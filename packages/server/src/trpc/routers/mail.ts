import { z } from "zod";

import {
	archiveMail,
	getMailAttachment,
	getMailLabelCounts,
	getMailThread,
	listMailConnections,
	listMailThreads,
	markMailAsRead,
	markMailAsUnread,
	rewriteMailSearchQuery,
	sendMail,
	starMail,
	trashMail,
	unstarMail,
} from "../../services/mail";
import type { WebldRouterFactoryOptions } from "../shared";

const RecipientSchema = z.object({
	name: z.string().optional(),
	email: z.string().email(),
});

const ThreadIdsSchema = z.object({
	connectionId: z.string(),
	threadIds: z.array(z.string()).min(1),
});

export const createMailRouter = ({ createTRPCRouter, organizationProcedure }: WebldRouterFactoryOptions) =>
	createTRPCRouter({
		listConnections: organizationProcedure.query(async ({ ctx }) =>
			listMailConnections({ organizationId: ctx.activeOrganizationId })
		),

		listThreads: organizationProcedure
			.input(
				z.object({
					connectionId: z.string().optional(),
					folder: z.string().optional(),
					query: z.string().optional(),
					maxResults: z.number().min(1).max(100).optional(),
					pageToken: z.string().optional(),
					classifyUnlabeled: z.boolean().optional(),
				})
			)
			.query(({ input, ctx }) => listMailThreads({ ...input, organizationId: ctx.activeOrganizationId })),

		rewriteSearchQuery: organizationProcedure
			.input(
				z.object({
					localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
					search: z.string().min(1).max(300),
				})
			)
			.query(async ({ input }) => rewriteMailSearchQuery({ localDate: input.localDate, search: input.search })),

		getThread: organizationProcedure
			.input(z.object({ connectionId: z.string(), threadId: z.string() }))
			.query(async ({ input, ctx }) => getMailThread({ ...input, organizationId: ctx.activeOrganizationId })),

		markAsRead: organizationProcedure
			.input(ThreadIdsSchema)
			.mutation(async ({ input, ctx }) => markMailAsRead({ ...input, organizationId: ctx.activeOrganizationId })),

		markAsUnread: organizationProcedure
			.input(ThreadIdsSchema)
			.mutation(async ({ input, ctx }) =>
				markMailAsUnread({ ...input, organizationId: ctx.activeOrganizationId })
			),

		star: organizationProcedure
			.input(ThreadIdsSchema)
			.mutation(async ({ input, ctx }) => starMail({ ...input, organizationId: ctx.activeOrganizationId })),

		unstar: organizationProcedure
			.input(ThreadIdsSchema)
			.mutation(async ({ input, ctx }) => unstarMail({ ...input, organizationId: ctx.activeOrganizationId })),

		archive: organizationProcedure
			.input(ThreadIdsSchema)
			.mutation(async ({ input, ctx }) => archiveMail({ ...input, organizationId: ctx.activeOrganizationId })),

		trash: organizationProcedure
			.input(ThreadIdsSchema)
			.mutation(async ({ input, ctx }) => trashMail({ ...input, organizationId: ctx.activeOrganizationId })),

		send: organizationProcedure
			.input(
				z.object({
					connectionId: z.string(),
					to: z.array(RecipientSchema).min(1),
					cc: z.array(RecipientSchema).optional(),
					bcc: z.array(RecipientSchema).optional(),
					subject: z.string(),
					body: z.string(),
					threadId: z.string().optional(),
					inReplyTo: z.string().optional(),
					references: z.string().optional(),
				})
			)
			.mutation(async ({ input, ctx }) => sendMail({ ...input, organizationId: ctx.activeOrganizationId })),

		getLabelCounts: organizationProcedure
			.input(z.object({ connectionId: z.string() }))
			.query(async ({ input, ctx }) =>
				getMailLabelCounts({ ...input, organizationId: ctx.activeOrganizationId })
			),

		getAttachment: organizationProcedure
			.input(
				z.object({
					connectionId: z.string(),
					messageId: z.string(),
					attachmentId: z.string(),
				})
			)
			.query(async ({ input, ctx }) => getMailAttachment({ ...input, organizationId: ctx.activeOrganizationId })),
	});
