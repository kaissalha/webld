import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

import { aiChatMessages, aiChats, db, oauthConnections, organizations } from "@webld/db";

export const resetDatabase = async () => {
	await db.delete(aiChatMessages);
	await db.delete(oauthConnections);
	await db.delete(aiChats);
	await db.delete(organizations);
};

export const cleanupOrganization = async (organizationId: string) => {
	// Delete tables with organizationId - cascading will handle children
	// aiChatMessages cascade from aiChats
	await db.delete(oauthConnections).where(eq(oauthConnections.organizationId, organizationId));
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
