// AI schema
export { aiChats } from "./schema/ai/chat.ts";
export { chatEpisodes } from "./schema/ai/episode.ts";
export { memories, memorySource } from "./schema/ai/memory.ts";
export { aiChatMessages, messageRole } from "./schema/ai/message.ts";

// Auth schema
export { accounts } from "./schema/auth/accounts.ts";
export { invitations } from "./schema/auth/invitations.ts";
export { members } from "./schema/auth/members.ts";
export { organizations } from "./schema/auth/organizations.ts";
export { sessions } from "./schema/auth/sessions.ts";
export { twoFactors } from "./schema/auth/two-factors.ts";
export { users } from "./schema/auth/users.ts";
export { verifications } from "./schema/auth/verifications.ts";

// Integrations schema
export {
	oauthConnectionStatusEnum,
	oauthConnections,
	oauthProviderEnum,
} from "./schema/integrations/oauth-connections.ts";
// Contacts schema
export { contacts } from "./schema/contacts/contacts.ts";
// Files (vault) schema
export {
	fileAccess,
	fileAccessValues,
	fileKind,
	fileKindValues,
	fileRagStatus,
	fileRagStatusValues,
	files,
	fileSourceType,
	fileSourceTypeValues,
} from "./schema/files/files.ts";
export { fileChunks } from "./schema/files/file-chunks.ts";
export { fileTagAssignments, fileTags } from "./schema/files/tags.ts";
