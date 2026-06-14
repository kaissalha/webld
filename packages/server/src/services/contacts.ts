import { cache } from "react";

import { TRPCError } from "@trpc/server";
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";

import { addFullTextSearch, type Contact, contacts, db, queryWithPagination, withOrderBy } from "@webld/db";

import type { PaginationProps } from "../types/pagination";

type ListContactsInput = PaginationProps & {
	organizationId: string;
	search?: string;
};

type FindContactInput = {
	id: string;
	organizationId: string;
};

type ContactFormInput = {
	email: string;
	firstName: string;
	lastName: string;
	phoneNumber?: string | null;
};

export const getContact = cache(async ({ id, organizationId }: FindContactInput) => {
	return db.query.contacts.findFirst({
		where: { id, organizationId },
	});
});

export const getContactByEmail = cache(async ({ email, organizationId }: { email: string; organizationId: string }) => {
	const normalizedEmail = email.trim().toLowerCase();
	if (!normalizedEmail) {
		return null;
	}

	const [contact] = await db
		.select()
		.from(contacts)
		.where(and(eq(contacts.organizationId, organizationId), sql`lower(${contacts.email}) = ${normalizedEmail}`))
		.limit(1);

	return contact ?? null;
});

export const listContacts = cache(
	async ({ cursor = null, order, organizationId, pageSize = 20, search, sort }: ListContactsInput) => {
		const whereConditions: SQL[] = [eq(contacts.organizationId, organizationId)];
		const query = db.select().from(contacts).$dynamic();

		if (sort) {
			withOrderBy({ query, model: contacts, orderBy: sort, order, joinedColumns: {} });
		}

		if (search) {
			addFullTextSearch({ whereConditions, model: contacts, searchTerm: search });
		}

		const whereCondition = and(...whereConditions) as SQL;
		query.where(whereCondition);

		return queryWithPagination({ query, model: contacts, pageSize, cursor, whereCondition });
	}
);

const mapContactInput = (input: ContactFormInput & { organizationId: string }) => ({
	email: input.email,
	firstName: input.firstName,
	lastName: input.lastName,
	organizationId: input.organizationId,
	phoneNumber: input.phoneNumber,
});

const throwDuplicateContactEmailError = (error: unknown) => {
	if (
		error &&
		typeof error === "object" &&
		"constraint" in error &&
		error.constraint === "contact_organization_email_idx"
	) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "There is another contact with this same email address.",
		});
	}

	throw error;
};

export const createContact = async (input: ContactFormInput & { organizationId: string }) => {
	const [createdContact] = await db
		.insert(contacts)
		.values(mapContactInput(input))
		.returning()
		.catch(throwDuplicateContactEmailError);

	return createdContact;
};

export const updateContact = async ({ id, organizationId, ...input }: FindContactInput & ContactFormInput) => {
	const existingContact = await getContact({ id, organizationId });
	if (!existingContact) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Contact not found",
		});
	}

	const [updatedContact] = await db
		.update(contacts)
		.set(mapContactInput({ ...input, organizationId }))
		.where(and(eq(contacts.organizationId, organizationId), eq(contacts.id, id)))
		.returning()
		.catch(throwDuplicateContactEmailError);

	return updatedContact;
};

export const deleteContact = async ({ id, organizationId }: FindContactInput) => {
	const existingContact = await getContact({ id, organizationId });
	if (!existingContact) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Contact not found",
		});
	}

	await db.delete(contacts).where(and(eq(contacts.organizationId, organizationId), eq(contacts.id, id)));
};

export const deleteManyContacts = async ({ ids, organizationId }: { ids: string[]; organizationId: string }) => {
	await db.delete(contacts).where(and(eq(contacts.organizationId, organizationId), inArray(contacts.id, ids)));
};

export type ContactListItem = Contact;
