import { z } from "zod";

import {
	createContact,
	deleteContact,
	getContact,
	getContactByEmail,
	listContacts,
	updateContact,
} from "../../services/contacts";
import { PaginationSchema } from "../../types/pagination";
import type { WebldRouterFactoryOptions } from "../shared";

const ContactInputSchema = z.object({
	email: z.email(),
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	phoneNumber: z.string().nullable().optional(),
});

export const createContactsRouter = ({ createTRPCRouter, organizationProcedure }: WebldRouterFactoryOptions) =>
	createTRPCRouter({
		create: organizationProcedure
			.input(ContactInputSchema)
			.mutation(async ({ ctx, input }) => createContact({ ...input, organizationId: ctx.activeOrganizationId })),
		delete: organizationProcedure
			.input(z.object({ id: z.string() }))
			.mutation(async ({ ctx, input }) => deleteContact({ ...input, organizationId: ctx.activeOrganizationId })),
		get: organizationProcedure
			.input(z.object({ id: z.string() }))
			.query(async ({ ctx, input }) => getContact({ ...input, organizationId: ctx.activeOrganizationId })),
		getByEmail: organizationProcedure
			.input(z.object({ email: z.email() }))
			.query(async ({ ctx, input }) =>
				getContactByEmail({ email: input.email, organizationId: ctx.activeOrganizationId })
			),
		list: organizationProcedure
			.input(
				PaginationSchema.extend({
					search: z.string().optional(),
				})
			)
			.query(async ({ ctx, input }) => listContacts({ ...input, organizationId: ctx.activeOrganizationId })),
		update: organizationProcedure
			.input(ContactInputSchema.extend({ id: z.string() }))
			.mutation(async ({ ctx, input }) => updateContact({ ...input, organizationId: ctx.activeOrganizationId })),
	});
