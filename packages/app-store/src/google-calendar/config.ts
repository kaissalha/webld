import { getBaseURL } from "@webld/utils";

import type { OAuthAppConfig } from "../types.ts";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
	throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
}

export const GOOGLE_CALENDAR_SCOPES = [
	"https://www.googleapis.com/auth/calendar",
	"https://www.googleapis.com/auth/userinfo.email",
	"https://www.googleapis.com/auth/userinfo.profile",
] as const;

export type GoogleCalendarScope = (typeof GOOGLE_CALENDAR_SCOPES)[number];

export const googleCalendarConfig: OAuthAppConfig<typeof GOOGLE_CALENDAR_SCOPES> = {
	name: "Google Calendar",
	description: "Connect your Google Calendar to view and manage events",
	logo: "/integrations/google-calendar.svg",
	clientId: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET,
	scopes: GOOGLE_CALENDAR_SCOPES,
	authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
	tokenUrl: "https://oauth2.googleapis.com/token",
	redirectUri: `${getBaseURL()}api/integrations/google-calendar/callback`,
	userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
};
