import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

import {
	aiChatMessages,
	aiChatStreams,
	aiChats,
	contacts,
	db,
	noteMentions,
	notes,
	oauthConnections,
	organizations,
} from "@webld/db";

export const resetDatabase = async () => {
	await db.delete(aiChatMessages);
	await db.delete(aiChatStreams);
	await db.delete(noteMentions);
	await db.delete(notes);
	await db.delete(oauthConnections);
	await db.delete(contacts);
	await db.delete(aiChats);
	await db.delete(organizations);
};

export const cleanupOrganization = async (organizationId: string) => {
	// Delete tables with organizationId - cascading will handle children
	// noteMentions cascades from notes
	// aiChatMessages, aiChatStreams cascade from aiChats
	await db.delete(notes).where(eq(notes.organizationId, organizationId));
	await db.delete(oauthConnections).where(eq(oauthConnections.organizationId, organizationId));
	await db.delete(contacts).where(eq(contacts.organizationId, organizationId));
	await db.delete(aiChats).where(eq(aiChats.organizationId, organizationId));
	await db.delete(organizations).where(eq(organizations.id, organizationId));
};

export const createTestOrganization = async ({ name }: { name?: string } = {}) => {
	const id = `org-${uuidv4()}`;
	const [organization] = await db
		.insert(organizations)
		.values({
			id,
			name: name ?? "Test Organization",
		})
		.returning();

	return organization;
};

export const createTestContact = async ({
	organizationId,
	overrides,
}: {
	organizationId: string;
	overrides?: Partial<{
		firstName: string;
		lastName: string;
		email: string;
		phoneNumber: string | null;
	}>;
}) => {
	const [contact] = await db
		.insert(contacts)
		.values({
			email: overrides?.email ?? `contact-${uuidv4()}@example.com`,
			firstName: overrides?.firstName ?? "Test",
			lastName: overrides?.lastName ?? "Contact",
			organizationId,
			phoneNumber: overrides?.phoneNumber ?? null,
		})
		.returning();

	return contact;
};

export const createTestChat = async ({ organizationId, title }: { organizationId: string; title?: string }) => {
	const [chat] = await db
		.insert(aiChats)
		.values({
			organizationId,
			title: title ?? "Test Chat",
		})
		.returning();

	return chat;
};
