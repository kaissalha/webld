import { OAuth2Client } from "google-auth-library";

import { OAuthTokenRevokedError } from "../types";
import { googleCalendarConfig } from "./config";
import type {
	CreateEventInput,
	GoogleCalendarEvent,
	GoogleCalendarEventsResponse,
	GoogleCalendarListResponse,
	UpdateEventInput,
} from "./types";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

export type GoogleCalendarDriverConfig = {
	accessToken: string;
	refreshToken: string;
	email: string;
};

export class GoogleCalendarDriver {
	private auth: OAuth2Client;

	constructor(config: GoogleCalendarDriverConfig) {
		this.auth = new OAuth2Client(googleCalendarConfig.clientId, googleCalendarConfig.clientSecret);

		this.auth.setCredentials({
			access_token: config.accessToken,
			refresh_token: config.refreshToken,
		});
	}

	async refreshAccessToken() {
		try {
			const { credentials } = await this.auth.refreshAccessToken();

			if (!credentials.access_token || !credentials.expiry_date) {
				throw new Error("Failed to refresh access token");
			}

			return {
				accessToken: credentials.access_token,
				expiresAt: new Date(credentials.expiry_date),
			};
		} catch (error) {
			const oauthError = error as { message?: string; code?: string };
			if (oauthError.message?.includes("invalid_grant") || oauthError.code === "invalid_grant") {
				throw new OAuthTokenRevokedError(
					"Google Calendar access has been revoked. Please reconnect your account.",
					"google_calendar"
				);
			}
			throw error;
		}
	}

	private async getAccessToken(): Promise<string> {
		const token = this.auth.credentials.access_token;
		if (!token) {
			const refreshed = await this.refreshAccessToken();
			this.auth.setCredentials({
				...this.auth.credentials,
				access_token: refreshed.accessToken,
				expiry_date: refreshed.expiresAt.getTime(),
			});
			return refreshed.accessToken;
		}
		return token;
	}

	private async fetchApi<T>(url: string, init?: RequestInit): Promise<T> {
		const accessToken = await this.getAccessToken();
		const response = await fetch(url, {
			...init,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
				...init?.headers,
			},
		});

		if (!response.ok) {
			const errorBody = await response.json().catch(() => undefined);
			const message =
				(errorBody as { error?: { message?: string } })?.error?.message ?? `HTTP ${response.status}`;
			throw new Error(`Google Calendar API error: ${message}`);
		}

		if (response.status === 204) return undefined as T;
		return (await response.json()) as T;
	}

	async listCalendars(): Promise<GoogleCalendarListResponse> {
		return this.fetchApi<GoogleCalendarListResponse>(`${CALENDAR_API_BASE}/users/me/calendarList`);
	}

	async listEvents({
		calendarId = "primary",
		timeMin,
		timeMax,
		maxResults = 250,
		pageToken,
		singleEvents = true,
		orderBy = "startTime",
	}: {
		calendarId?: string;
		timeMin?: string;
		timeMax?: string;
		maxResults?: number;
		pageToken?: string;
		singleEvents?: boolean;
		orderBy?: "startTime" | "updated";
	} = {}): Promise<GoogleCalendarEventsResponse> {
		const params = new URLSearchParams();
		if (timeMin) params.set("timeMin", timeMin);
		if (timeMax) params.set("timeMax", timeMax);
		params.set("maxResults", String(maxResults));
		if (pageToken) params.set("pageToken", pageToken);
		params.set("singleEvents", String(singleEvents));
		if (singleEvents) params.set("orderBy", orderBy);

		const encodedCalendarId = encodeURIComponent(calendarId);
		return this.fetchApi<GoogleCalendarEventsResponse>(
			`${CALENDAR_API_BASE}/calendars/${encodedCalendarId}/events?${params}`
		);
	}

	async getEvent({
		calendarId = "primary",
		eventId,
	}: {
		calendarId?: string;
		eventId: string;
	}): Promise<GoogleCalendarEvent> {
		const encodedCalendarId = encodeURIComponent(calendarId);
		const encodedEventId = encodeURIComponent(eventId);
		return this.fetchApi<GoogleCalendarEvent>(
			`${CALENDAR_API_BASE}/calendars/${encodedCalendarId}/events/${encodedEventId}`
		);
	}

	async createEvent({
		calendarId = "primary",
		event,
		withMeetLink = false,
	}: {
		calendarId?: string;
		event: CreateEventInput;
		withMeetLink?: boolean;
	}): Promise<GoogleCalendarEvent> {
		const encodedCalendarId = encodeURIComponent(calendarId);
		const conferenceParam = withMeetLink ? "&conferenceDataVersion=1" : "";

		const body: Record<string, unknown> = { ...event };
		if (withMeetLink) {
			body.conferenceData = {
				createRequest: {
					requestId: crypto.randomUUID(),
					conferenceSolutionKey: { type: "hangoutsMeet" },
				},
			};
		}

		return this.fetchApi<GoogleCalendarEvent>(
			`${CALENDAR_API_BASE}/calendars/${encodedCalendarId}/events?sendUpdates=none${conferenceParam}`,
			{ method: "POST", body: JSON.stringify(body) }
		);
	}

	async updateEvent({
		calendarId = "primary",
		eventId,
		event,
	}: {
		calendarId?: string;
		eventId: string;
		event: UpdateEventInput;
	}): Promise<GoogleCalendarEvent> {
		const encodedCalendarId = encodeURIComponent(calendarId);
		const encodedEventId = encodeURIComponent(eventId);
		return this.fetchApi<GoogleCalendarEvent>(
			`${CALENDAR_API_BASE}/calendars/${encodedCalendarId}/events/${encodedEventId}?sendUpdates=none`,
			{ method: "PATCH", body: JSON.stringify(event) }
		);
	}

	async deleteEvent({ calendarId = "primary", eventId }: { calendarId?: string; eventId: string }): Promise<void> {
		const encodedCalendarId = encodeURIComponent(calendarId);
		const encodedEventId = encodeURIComponent(eventId);
		await this.fetchApi<void>(
			`${CALENDAR_API_BASE}/calendars/${encodedCalendarId}/events/${encodedEventId}?sendUpdates=none`,
			{ method: "DELETE" }
		);
	}
}

export const createGoogleCalendarDriver = (config: GoogleCalendarDriverConfig) => {
	return new GoogleCalendarDriver(config);
};
