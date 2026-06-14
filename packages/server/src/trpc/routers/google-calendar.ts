import { z } from "zod";

import {
	createGoogleCalendarEvent,
	deleteGoogleCalendarEvent,
	disconnectGoogleCalendar,
	getCalendarConnection,
	getGoogleCalendarEvent,
	listAllCalendarEvents,
	listGoogleCalendarEvents,
	listGoogleCalendars,
	updateGoogleCalendarEvent,
} from "../../services/google-calendar";
import type { StarterRouterFactoryOptions } from "../shared";

const EventDateTimeSchema = z.object({
	dateTime: z.string().optional(),
	date: z.string().optional(),
	timeZone: z.string().optional(),
});

const AttendeeSchema = z.object({
	email: z.string().email(),
	displayName: z.string().optional(),
});

const CreateEventInputSchema = z.object({
	summary: z.string(),
	description: z.string().optional(),
	location: z.string().optional(),
	start: EventDateTimeSchema,
	end: EventDateTimeSchema,
	attendees: z.array(AttendeeSchema).optional(),
});

export const createGoogleCalendarRouter = ({ createTRPCRouter, organizationProcedure }: StarterRouterFactoryOptions) =>
	createTRPCRouter({
		getStatus: organizationProcedure.query(async ({ ctx }) => {
			const connection = await getCalendarConnection({ organizationId: ctx.activeOrganizationId });
			return {
				connected: !!connection,
				email: connection?.email ?? null,
				name: connection?.name ?? null,
				picture: connection?.picture ?? null,
			};
		}),

		listCalendars: organizationProcedure.query(async ({ ctx }) =>
			listGoogleCalendars({ organizationId: ctx.activeOrganizationId })
		),

		listAllEvents: organizationProcedure
			.input(
				z.object({
					timeMin: z.string(),
					timeMax: z.string(),
				})
			)
			.query(async ({ input, ctx }) =>
				listAllCalendarEvents({ ...input, organizationId: ctx.activeOrganizationId })
			),

		getEvent: organizationProcedure
			.input(
				z.object({
					calendarId: z.string(),
					eventId: z.string(),
				})
			)
			.query(async ({ input, ctx }) => {
				const event = await getGoogleCalendarEvent({
					organizationId: ctx.activeOrganizationId,
					calendarId: input.calendarId,
					eventId: input.eventId,
				});
				const { calendars } = await listGoogleCalendars({ organizationId: ctx.activeOrganizationId });
				const cal = calendars.find((c) => c.id === input.calendarId);
				return {
					...event,
					calendarId: input.calendarId,
					calendarName: cal?.summary ?? input.calendarId,
					calendarColor: cal?.backgroundColor,
				};
			}),

		listEvents: organizationProcedure
			.input(
				z.object({
					calendarId: z.string().optional(),
					timeMin: z.string().optional(),
					timeMax: z.string().optional(),
					maxResults: z.number().min(1).max(2500).optional(),
					pageToken: z.string().optional(),
				})
			)
			.query(async ({ input, ctx }) =>
				listGoogleCalendarEvents({ ...input, organizationId: ctx.activeOrganizationId })
			),

		createEvent: organizationProcedure
			.input(
				z.object({
					calendarId: z.string().optional(),
					event: CreateEventInputSchema,
					withMeetLink: z.boolean().optional(),
				})
			)
			.mutation(async ({ input, ctx }) =>
				createGoogleCalendarEvent({ ...input, organizationId: ctx.activeOrganizationId })
			),

		updateEvent: organizationProcedure
			.input(
				z.object({
					calendarId: z.string().optional(),
					eventId: z.string(),
					event: CreateEventInputSchema.partial(),
				})
			)
			.mutation(async ({ input, ctx }) =>
				updateGoogleCalendarEvent({ ...input, organizationId: ctx.activeOrganizationId })
			),

		deleteEvent: organizationProcedure
			.input(
				z.object({
					calendarId: z.string().optional(),
					eventId: z.string(),
				})
			)
			.mutation(async ({ input, ctx }) =>
				deleteGoogleCalendarEvent({ ...input, organizationId: ctx.activeOrganizationId })
			),

		disconnect: organizationProcedure.mutation(async ({ ctx }) =>
			disconnectGoogleCalendar({ organizationId: ctx.activeOrganizationId })
		),
	});
