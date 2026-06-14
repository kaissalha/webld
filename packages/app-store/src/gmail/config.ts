import { getBaseURL } from "@webld/utils";

import type { OAuthAppConfig } from "../types.ts";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
	throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
}

export const GMAIL_SCOPES = [
	"https://mail.google.com/",
	"https://www.googleapis.com/auth/gmail.readonly",
	"https://www.googleapis.com/auth/gmail.send",
	"https://www.googleapis.com/auth/gmail.modify",
	"https://www.googleapis.com/auth/userinfo.email",
	"https://www.googleapis.com/auth/userinfo.profile",
] as const;

export type GmailScope = (typeof GMAIL_SCOPES)[number];

export const gmailConfig: OAuthAppConfig<typeof GMAIL_SCOPES> = {
	name: "Gmail",
	description: "Connect your Gmail account to send and receive emails",
	logo: "/integrations/gmail.svg",
	clientId: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET,
	scopes: GMAIL_SCOPES,
	authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
	tokenUrl: "https://oauth2.googleapis.com/token",
	redirectUri: `${getBaseURL()}api/integrations/gmail/callback`,
	userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
};
