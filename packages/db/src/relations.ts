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
		files: r.many.files(),
		fileTags: r.many.fileTags(),
		memories: r.many.memories(),
		chatEpisodes: r.many.chatEpisodes(),
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

	files: {
		organization: r.one.organizations({
			from: r.files.organizationId,
			to: r.organizations.id,
		}),
		uploader: r.one.users({
			from: r.files.uploadedBy,
			to: r.users.id,
			optional: true,
		}),
		chunks: r.many.fileChunks(),
		tagAssignments: r.many.fileTagAssignments(),
	},

	fileChunks: {
		file: r.one.files({
			from: r.fileChunks.fileId,
			to: r.files.id,
		}),
		organization: r.one.organizations({
			from: r.fileChunks.organizationId,
			to: r.organizations.id,
		}),
	},

	fileTags: {
		organization: r.one.organizations({
			from: r.fileTags.organizationId,
			to: r.organizations.id,
		}),
		assignments: r.many.fileTagAssignments(),
	},

	fileTagAssignments: {
		file: r.one.files({
			from: r.fileTagAssignments.fileId,
			to: r.files.id,
		}),
		tag: r.one.fileTags({
			from: r.fileTagAssignments.tagId,
			to: r.fileTags.id,
		}),
		organization: r.one.organizations({
			from: r.fileTagAssignments.organizationId,
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
		episode: r.one.chatEpisodes({
			from: r.aiChats.id,
			to: r.chatEpisodes.chatId,
			optional: true,
		}),
	},

	// Memory relations
	memories: {
		organization: r.one.organizations({
			from: r.memories.organizationId,
			to: r.organizations.id,
		}),
		sourceChat: r.one.aiChats({
			from: r.memories.sourceChatId,
			to: r.aiChats.id,
			optional: true,
		}),
	},

	// Chat episode relations
	chatEpisodes: {
		chat: r.one.aiChats({
			from: r.chatEpisodes.chatId,
			to: r.aiChats.id,
		}),
		organization: r.one.organizations({
			from: r.chatEpisodes.organizationId,
			to: r.organizations.id,
		}),
	},

	// AI Chat Messages relations
	aiChatMessages: {
		chat: r.one.aiChats({
			from: r.aiChatMessages.chatId,
			to: r.aiChats.id,
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
}));
