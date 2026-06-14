import { tool } from "ai";
import { z } from "zod";

import { listAllCalendarEvents } from "../../services/google-calendar";
import type { AppContext } from "../types";

const calendarEventSchema = z.object({
	calendarId: z.string(),
	calendarName: z.string(),
	createdAt: z.string().nullable(),
	endDate: z.string().nullable(),
	endDateTime: z.string().nullable(),
	htmlLink: z.string().nullable(),
	id: z.string(),
	location: z.string().nullable(),
	startDate: z.string().nullable(),
	startDateTime: z.string().nullable(),
	status: z.string().nullable(),
	summary: z.string().nullable(),
});

export const listCalendarEventsTool = tool({
	description:
		"Get upcoming Google Calendar events across connected calendars. Use this when the user asks about today's schedule, upcoming appointments, or calendar availability.",
	inputSchema: z.object({
		daysAhead: z.number().min(1).max(30).optional().default(7).describe("How many days ahead to look"),
		maxResults: z.number().min(1).max(25).optional().default(10).describe("How many events to return"),
	}),
	outputSchema: z.object({
		error: z.string().optional(),
		events: z.array(calendarEventSchema).optional(),
		message: z.string().optional(),
		status: z.enum(["loading", "success", "error"]),
		totalCount: z.number().optional(),
	}),
	async *execute({ daysAhead, maxResults }, { experimental_context }) {
		const ctx = experimental_context as AppContext;

		yield { status: "loading", message: "Fetching calendar events..." };

		if (!ctx.organizationId) {
			yield { status: "error", error: "Organization context not found" };
			return;
		}

		try {
			const timeMin = new Date().toISOString();
			const timeMax = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
			const result = await listAllCalendarEvents({
				organizationId: ctx.organizationId,
				timeMax,
				timeMin,
			});

			yield {
				status: "success",
				events: result.events
					.toSorted((left, right) => {
						const leftStart = left.start.dateTime || left.start.date || "";
						const rightStart = right.start.dateTime || right.start.date || "";
						return leftStart.localeCompare(rightStart);
					})
					.slice(0, maxResults)
					.map((event) => ({
						calendarId: event.calendarId,
						calendarName: event.calendarName,
						createdAt: event.created ?? null,
						endDate: event.end.date ?? null,
						endDateTime: event.end.dateTime ?? null,
						htmlLink: event.htmlLink ?? null,
						id: event.id,
						location: event.location ?? null,
						startDate: event.start.date ?? null,
						startDateTime: event.start.dateTime ?? null,
						status: event.status ?? null,
						summary: event.summary ?? null,
					})),
				totalCount: result.events.length,
			};
		} catch (error) {
			yield {
				status: "error",
				error: error instanceof Error ? error.message : "Failed to fetch calendar events",
			};
		}
	},
});
