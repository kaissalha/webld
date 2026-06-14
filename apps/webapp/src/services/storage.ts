import { and, eq } from "drizzle-orm";

import { db, type UploadedMediaAccess, uploadedMedia } from "@starter/db";

type StorageRowColumns = {
	id?: boolean;
	url?: boolean;
	access?: boolean;
};

export const findStorageByUrl = async (
	organizationId: string,
	url: string,
	columns: StorageRowColumns = { id: true }
) =>
	db.query.uploadedMedia.findFirst({
		where: { organizationId, url },
		columns,
	});

export const createStorageRecord = async (params: {
	organizationId: string;
	url: string;
	contentType: string;
	access: UploadedMediaAccess;
}) => {
	await db.insert(uploadedMedia).values({
		organizationId: params.organizationId,
		url: params.url,
		contentType: params.contentType,
		access: params.access,
	});
};

export const deleteStorageRecordByUrl = async (params: { organizationId: string; url: string }) => {
	await db
		.delete(uploadedMedia)
		.where(and(eq(uploadedMedia.organizationId, params.organizationId), eq(uploadedMedia.url, params.url)));
};
