export type EventDateTime = {
	dateTime?: string;
	date?: string;
	timeZone?: string;
};

export type EventAttendee = {
	email: string;
	displayName?: string;
	responseStatus?: "needsAction" | "declined" | "tentative" | "accepted";
	self?: boolean;
	organizer?: boolean;
};

export type ConferenceEntryPoint = {
	entryPointType?: string;
	uri?: string;
	label?: string;
};

export type ConferenceData = {
	entryPoints?: ConferenceEntryPoint[];
	conferenceSolution?: {
		name?: string;
		iconUri?: string;
	};
};

export type GoogleCalendarEvent = {
	id: string;
	status?: "confirmed" | "tentative" | "cancelled";
	summary?: string;
	description?: string;
	location?: string;
	start: EventDateTime;
	end: EventDateTime;
	attendees?: EventAttendee[];
	organizer?: { email?: string; displayName?: string; self?: boolean };
	creator?: { email?: string; displayName?: string; self?: boolean };
	htmlLink?: string;
	hangoutLink?: string;
	conferenceData?: ConferenceData;
	created?: string;
	updated?: string;
	colorId?: string;
	transparency?: "opaque" | "transparent";
	recurringEventId?: string;
};

export type GoogleCalendarListEntry = {
	id: string;
	summary: string;
	description?: string;
	backgroundColor?: string;
	foregroundColor?: string;
	primary?: boolean;
	accessRole?: "freeBusyReader" | "reader" | "writer" | "owner";
	selected?: boolean;
	timeZone?: string;
};

export type GoogleCalendarListResponse = {
	kind: "calendar#calendarList";
	items: GoogleCalendarListEntry[];
	nextPageToken?: string;
};

export type GoogleCalendarEventsResponse = {
	kind: "calendar#events";
	summary?: string;
	timeZone?: string;
	items: GoogleCalendarEvent[];
	nextPageToken?: string;
};

export type CreateEventInput = {
	summary: string;
	description?: string;
	location?: string;
	start: EventDateTime;
	end: EventDateTime;
	attendees?: Pick<EventAttendee, "email" | "displayName">[];
};

export type UpdateEventInput = Partial<CreateEventInput>;
