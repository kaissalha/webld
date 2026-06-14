import { defineRelations } from "drizzle-orm";

import * as schema from "./schema.ts";

export const relations = defineRelations(schema, (r) => ({
	// Better Auth
	users: {
		accounts: r.many.accounts(),
		sessions: r.many.sessions(),
		members: r.many.members(),
		invitations: r.many.invitations(),
		twoFactors: r.many.twoFactors(),
	},

	accounts: {
		user: r.one.users({
			from: r.accounts.userId,
			to: r.users.id,
		}),
	},

	sessions: {
		user: r.one.users({
			from: r.sessions.userId,
			to: r.users.id,
		}),
		activeOrganization: r.one.organizations({
			from: r.sessions.activeOrganizationId,
			to: r.organizations.id,
			optional: true,
		}),
	},

	organizations: {
		members: r.many.members(),
		invitations: r.many.invitations(),
		sessions: r.many.sessions(),
		uploadedMedia: r.many.uploadedMedia(),
		ragDocuments: r.many.ragDocuments(),
	},

	members: {
		user: r.one.users({
			from: r.members.userId,
			to: r.users.id,
		}),
		organization: r.one.organizations({
			from: r.members.organizationId,
			to: r.organizations.id,
		}),
	},

	invitations: {
		organization: r.one.organizations({
			from: r.invitations.organizationId,
			to: r.organizations.id,
		}),
		inviter: r.one.users({
			from: r.invitations.inviterId,
			to: r.users.id,
		}),
	},

	twoFactors: {
		user: r.one.users({
			from: r.twoFactors.userId,
			to: r.users.id,
		}),
	},

	uploadedMedia: {
		organization: r.one.organizations({
			from: r.uploadedMedia.organizationId,
			to: r.organizations.id,
		}),
	},

	// AI Chat relations
	aiChats: {
		organization: r.one.organizations({
			from: r.aiChats.organizationId,
			to: r.organizations.id,
		}),
		messages: r.many.aiChatMessages(),
		streams: r.many.aiChatStreams(),
	},

	// AI Chat Messages relations
	aiChatMessages: {
		chat: r.one.aiChats({
			from: r.aiChatMessages.chatId,
			to: r.aiChats.id,
		}),
	},

	// AI Chat Streams relations
	aiChatStreams: {
		chat: r.one.aiChats({
			from: r.aiChatStreams.chatId,
			to: r.aiChats.id,
		}),
	},

	ragDocuments: {
		organization: r.one.organizations({
			from: r.ragDocuments.organizationId,
			to: r.organizations.id,
		}),
		chunks: r.many.ragDocumentChunks(),
	},

	ragDocumentChunks: {
		document: r.one.ragDocuments({
			from: r.ragDocumentChunks.documentId,
			to: r.ragDocuments.id,
		}),
		organization: r.one.organizations({
			from: r.ragDocumentChunks.organizationId,
			to: r.organizations.id,
		}),
	},

	// OAuth Connections relations
	oauthConnections: {
		user: r.one.users({
			from: r.oauthConnections.userId,
			to: r.users.id,
		}),
		organization: r.one.organizations({
			from: r.oauthConnections.organizationId,
			to: r.organizations.id,
		}),
	},

	// Contacts relations
	contacts: {
		organization: r.one.organizations({
			from: r.contacts.organizationId,
			to: r.organizations.id,
		}),
	},

	// Notes relations
	notes: {
		organization: r.one.organizations({
			from: r.notes.organizationId,
			to: r.organizations.id,
		}),
		mentions: r.many.noteMentions(),
	},

	// Note Mentions relations
	noteMentions: {
		note: r.one.notes({
			from: r.noteMentions.noteId,
			to: r.notes.id,
		}),
	},
}));
