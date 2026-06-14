import { TRPCError } from "@trpc/server";
import { and, eq, inArray, type SQL } from "drizzle-orm";

import {
	addFullTextSearch,
	db,
	type NoteMention,
	type NoteMentionResourceType,
	noteMentions,
	notes,
	queryWithPagination,
	withOrderBy,
} from "@webld/db";

import type { PaginationProps } from "../types/pagination";

type MentionInput = {
	resourceType: NoteMentionResourceType;
	resourceId: string;
};

type ListNotesInput = PaginationProps & {
	organizationId: string;
	search?: string;
	resourceType?: NoteMentionResourceType;
	resourceId?: string;
};

export const getNote = async ({ id, organizationId }: { organizationId: string; id: string }) => {
	const note = await db.query.notes.findFirst({
		where: { id, organizationId },
		with: {
			mentions: true,
		},
	});

	return note;
};

export const listNotes = async ({
	pageSize = 20,
	cursor = null,
	sort = "createdAt",
	order = "desc",
	search,
	organizationId,
	resourceType,
	resourceId,
}: ListNotesInput) => {
	// If filtering by resource, first get the note IDs that mention this resource
	let noteIdsWithResource: string[] | undefined;

	if (resourceType && resourceId) {
		const mentionsForResource = await db
			.select({ noteId: noteMentions.noteId })
			.from(noteMentions)
			.where(and(eq(noteMentions.resourceType, resourceType), eq(noteMentions.resourceId, resourceId)));

		noteIdsWithResource = mentionsForResource.map((m) => m.noteId);

		// If no notes mention this resource, return empty result
		if (noteIdsWithResource.length === 0) {
			return {
				data: [],
				meta: {
					totalData: 0,
					totalPages: 0,
					cursor: null,
				},
			};
		}
	}

	const whereConditions: SQL[] = [eq(notes.organizationId, organizationId)];

	if (noteIdsWithResource) {
		whereConditions.push(inArray(notes.id, noteIdsWithResource));
	}

	const query = db.select().from(notes).$dynamic();

	if (sort) {
		withOrderBy({ query, model: notes, orderBy: sort, order, joinedColumns: {} });
	}

	if (search) {
		addFullTextSearch({ whereConditions, model: notes, searchTerm: search });
	}

	const whereCondition = and(...whereConditions) as SQL;
	query.where(whereCondition);

	const result = await queryWithPagination({ query, model: notes, pageSize, cursor, whereCondition });

	// Fetch mentions for all notes
	if (result.data.length > 0) {
		const noteIds = result.data.map((n) => n.id);
		const allMentions = await db.select().from(noteMentions).where(inArray(noteMentions.noteId, noteIds));

		const mentionsByNoteId = allMentions.reduce(
			(acc, mention) => {
				if (!acc[mention.noteId]) {
					acc[mention.noteId] = [];
				}
				acc[mention.noteId].push(mention);
				return acc;
			},
			{} as Record<string, NoteMention[]>
		);

		const notesWithMentions = result.data.map((note) => ({
			...note,
			mentions: mentionsByNoteId[note.id] || [],
		}));

		return {
			...result,
			data: notesWithMentions,
		};
	}

	return {
		...result,
		data: result.data.map((note) => ({ ...note, mentions: [] as NoteMention[] })),
	};
};

export const createNote = async (input: { organizationId: string; body: string; mentions?: MentionInput[] }) => {
	const { mentions = [], ...noteData } = input;

	const [createdNote] = await db
		.insert(notes)
		.values({
			organizationId: noteData.organizationId,
			body: noteData.body,
		})
		.returning();

	// Insert mentions if provided
	let createdMentions: NoteMention[] = [];
	if (mentions.length > 0) {
		createdMentions = await db
			.insert(noteMentions)
			.values(
				mentions.map((mention) => ({
					noteId: createdNote.id,
					resourceType: mention.resourceType,
					resourceId: mention.resourceId,
				}))
			)
			.returning();
	}

	return {
		...createdNote,
		mentions: createdMentions,
	};
};

export const updateNote = async ({
	id,
	organizationId,
	mentions = [],
	...input
}: {
	organizationId: string;
	id: string;
	body: string;
	mentions?: MentionInput[];
}) => {
	const existingNote = await db.query.notes.findFirst({
		where: { id, organizationId },
	});

	if (!existingNote) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Note not found",
		});
	}

	const [updatedNote] = await db
		.update(notes)
		.set({
			body: input.body,
			updatedAt: new Date().toISOString(),
		})
		.where(and(eq(notes.organizationId, organizationId), eq(notes.id, id)))
		.returning();

	// Sync mentions: delete existing and insert new ones
	await db.delete(noteMentions).where(eq(noteMentions.noteId, id));

	let updatedMentions: NoteMention[] = [];
	if (mentions.length > 0) {
		updatedMentions = await db
			.insert(noteMentions)
			.values(
				mentions.map((mention) => ({
					noteId: id,
					resourceType: mention.resourceType,
					resourceId: mention.resourceId,
				}))
			)
			.returning();
	}

	return {
		...updatedNote,
		mentions: updatedMentions,
	};
};

export const deleteNote = async ({ organizationId, id }: { organizationId: string; id: string }) => {
	const existingNote = await db.query.notes.findFirst({
		where: { id, organizationId },
	});

	if (!existingNote) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Note not found",
		});
	}

	// Mentions will be cascade deleted
	await db.delete(notes).where(and(eq(notes.organizationId, organizationId), eq(notes.id, id)));
};
