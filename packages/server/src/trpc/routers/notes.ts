import { z } from "zod";

import { createNote, deleteNote, getNote, listNotes, updateNote } from "../../services/notes";
import { PaginationSchema } from "../../types/pagination";
import type { WebldRouterFactoryOptions } from "../shared";

const MentionSchema = z.object({
	resourceType: z.enum(["contact"]),
	resourceId: z.string(),
});

export const createNotesRouter = ({ createTRPCRouter, organizationProcedure }: WebldRouterFactoryOptions) =>
	createTRPCRouter({
		get: organizationProcedure
			.input(
				z.object({
					id: z.string(),
				})
			)
			.query(async ({ input, ctx }) => getNote({ ...input, organizationId: ctx.activeOrganizationId })),

		list: organizationProcedure
			.input(
				PaginationSchema.extend({
					search: z.string().optional(),
					resourceType: z.enum(["contact"]).optional(),
					resourceId: z.string().optional(),
				})
			)
			.query(async ({ input, ctx }) => listNotes({ ...input, organizationId: ctx.activeOrganizationId })),

		create: organizationProcedure
			.input(
				z.object({
					body: z.string(),
					mentions: z.array(MentionSchema).optional(),
				})
			)
			.mutation(async ({ input, ctx }) => createNote({ ...input, organizationId: ctx.activeOrganizationId })),

		update: organizationProcedure
			.input(
				z.object({
					id: z.string(),
					body: z.string(),
					mentions: z.array(MentionSchema).optional(),
				})
			)
			.mutation(async ({ input, ctx }) => updateNote({ ...input, organizationId: ctx.activeOrganizationId })),

		delete: organizationProcedure
			.input(
				z.object({
					id: z.string(),
				})
			)
			.mutation(async ({ input, ctx }) => deleteNote({ ...input, organizationId: ctx.activeOrganizationId })),
	});
