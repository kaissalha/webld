import { v4 as uuidv4 } from "uuid";
import { afterEach, describe, expect, it } from "vitest";

import { createNote, getNote, listNotes, updateNote } from "../../src/services/notes";
import { cleanupOrganization, createTestOrganization } from "../helpers/db";

describe("notes service", () => {
	const organizationIds: string[] = [];

	afterEach(async () => {
		for (const id of organizationIds) {
			await cleanupOrganization(id);
		}
		organizationIds.length = 0;
	});

	const createTrackedOrganization = async () => {
		const org = await createTestOrganization();
		organizationIds.push(org.id);
		return org;
	};

	it("creates and fetches notes with mentions", async () => {
		const organization = await createTrackedOrganization();
		const resourceId = uuidv4();

		const created = await createNote({
			organizationId: organization.id,
			body: "Note body",
			mentions: [{ resourceType: "contact", resourceId }],
		});

		const fetched = await getNote({ id: created.id, organizationId: organization.id });

		expect(fetched?.mentions?.length).toBe(1);
	});

	it("lists notes filtered by resource", async () => {
		const organization = await createTrackedOrganization();
		const resourceId = uuidv4();

		await createNote({
			organizationId: organization.id,
			body: "Note body",
			mentions: [{ resourceType: "contact", resourceId }],
		});

		const result = await listNotes({
			organizationId: organization.id,
			resourceType: "contact",
			resourceId,
		});

		expect(result.data.length).toBe(1);
	});

	it("returns empty list when resource has no mentions", async () => {
		const organization = await createTrackedOrganization();

		const result = await listNotes({
			organizationId: organization.id,
			resourceType: "contact",
			resourceId: uuidv4(),
		});

		expect(result.data).toEqual([]);
		expect(result.meta.totalData).toBe(0);
	});

	it("updates existing note", async () => {
		const organization = await createTrackedOrganization();

		const created = await createNote({
			organizationId: organization.id,
			body: "Note body",
		});

		const updated = await updateNote({
			organizationId: organization.id,
			id: created.id,
			body: "Updated body",
		});

		expect(updated.body).toBe("Updated body");
	});
});
