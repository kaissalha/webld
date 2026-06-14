import { and, eq } from "drizzle-orm";

import {
	createGoogleCalendarDriver,
	type CreateEventInput,
	type GoogleCalendarEvent,
	type UpdateEventInput,
} from "@starter/app-store";
import { db, type OAuthConnection, oauthConnections } from "@starter/db";

import { refreshStoredOAuthAccessToken } from "./oauth-token-refresh";

export const getCalendarConnection = async ({ organizationId }: { organizationId: string }) => {
	const [connection] = await db
		.select()
		.from(oauthConnections)
		.where(
			and(
				eq(oauthConnections.organizationId, organizationId),
				eq(oauthConnections.provider, "google_calendar"),
				eq(oauthConnections.status, "connected")
			)
		)
		.limit(1);

	return connection ?? null;
};

export const createCalendarDriverFromConnection = async (connection: OAuthConnection) => {
	const expiresAt = new Date(connection.expiresAt);
	const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

	let accessToken = connection.accessToken;

	if (expiresAt < fiveMinutesFromNow) {
		accessToken = await refreshStoredOAuthAccessToken(connection);
	} else {
		await db
			.update(oauthConnections)
			.set({ lastAccessedAt: new Date().toISOString() })
			.where(eq(oauthConnections.id, connection.id));
	}

	return createGoogleCalendarDriver({
		accessToken,
		refreshToken: connection.refreshToken,
		email: connection.email,
	});
};

const requireConnection = async (organizationId: string) => {
	const connection = await getCalendarConnection({ organizationId });
	if (!connection) {
		throw new Error("No Google Calendar connection found. Please connect your Google account first.");
	}
	return connection;
};

export const listGoogleCalendars = async ({ organizationId }: { organizationId: string }) => {
	const connection = await requireConnection(organizationId);
	const driver = await createCalendarDriverFromConnection(connection);
	const response = await driver.listCalendars();

	return {
		calendars: response.items,
		connectionId: connection.id,
		connectionEmail: connection.email,
	};
};

export const listAllCalendarEvents = async ({
	organizationId,
	timeMin,
	timeMax,
}: {
	organizationId: string;
	timeMin: string;
	timeMax: string;
}) => {
	const connection = await requireConnection(organizationId);
	const driver = await createCalendarDriverFromConnection(connection);

	const calendarsResponse = await driver.listCalendars();
	const subscribedCalendars = calendarsResponse.items.filter(
		(cal) =>
			cal.selected !== false &&
			(cal.accessRole === "owner" || cal.accessRole === "writer" || cal.accessRole === "reader")
	);

	const allEvents: (GoogleCalendarEvent & { calendarId: string; calendarName: string; calendarColor?: string })[] =
		[];

	const results = await Promise.allSettled(
		subscribedCalendars.map(async (cal) => {
			const response = await driver.listEvents({
				calendarId: cal.id,
				timeMin,
				timeMax,
				maxResults: 250,
				singleEvents: true,
				orderBy: "startTime",
			});
			return { calendar: cal, events: response.items };
		})
	);

	for (const result of results) {
		if (result.status !== "fulfilled") continue;
		const { calendar: cal, events } = result.value;
		for (const event of events) {
			if (event.status === "cancelled") continue;
			allEvents.push({
				...event,
				calendarId: cal.id,
				calendarName: cal.summary,
				calendarColor: cal.backgroundColor,
			});
		}
	}

	return {
		events: allEvents,
		calendars: subscribedCalendars,
		connectionId: connection.id,
	};
};

export const listGoogleCalendarEvents = async ({
	organizationId,
	calendarId,
	timeMin,
	timeMax,
	maxResults,
	pageToken,
}: {
	organizationId: string;
	calendarId?: string;
	timeMin?: string;
	timeMax?: string;
	maxResults?: number;
	pageToken?: string;
}) => {
	const connection = await requireConnection(organizationId);
	const driver = await createCalendarDriverFromConnection(connection);
	const response = await driver.listEvents({ calendarId, timeMin, timeMax, maxResults, pageToken });

	return {
		events: response.items,
		timeZone: response.timeZone,
		nextPageToken: response.nextPageToken,
		connectionId: connection.id,
	};
};

export const getGoogleCalendarEvent = async ({
	organizationId,
	calendarId,
	eventId,
}: {
	organizationId: string;
	calendarId?: string;
	eventId: string;
}) => {
	const connection = await requireConnection(organizationId);
	const driver = await createCalendarDriverFromConnection(connection);
	return driver.getEvent({ calendarId, eventId });
};

export const createGoogleCalendarEvent = async ({
	organizationId,
	calendarId,
	event,
	withMeetLink,
}: {
	organizationId: string;
	calendarId?: string;
	event: CreateEventInput;
	withMeetLink?: boolean;
}) => {
	const connection = await requireConnection(organizationId);
	const driver = await createCalendarDriverFromConnection(connection);
	return driver.createEvent({ calendarId, event, withMeetLink });
};

export const updateGoogleCalendarEvent = async ({
	organizationId,
	calendarId,
	eventId,
	event,
}: {
	organizationId: string;
	calendarId?: string;
	eventId: string;
	event: UpdateEventInput;
}) => {
	const connection = await requireConnection(organizationId);
	const driver = await createCalendarDriverFromConnection(connection);
	return driver.updateEvent({ calendarId, eventId, event });
};

export const deleteGoogleCalendarEvent = async ({
	organizationId,
	calendarId,
	eventId,
}: {
	organizationId: string;
	calendarId?: string;
	eventId: string;
}) => {
	const connection = await requireConnection(organizationId);
	const driver = await createCalendarDriverFromConnection(connection);
	await driver.deleteEvent({ calendarId, eventId });
};

export const disconnectGoogleCalendar = async ({ organizationId }: { organizationId: string }) => {
	const connection = await getCalendarConnection({ organizationId });
	if (!connection) return;

	await db.delete(oauthConnections).where(eq(oauthConnections.id, connection.id));
};
