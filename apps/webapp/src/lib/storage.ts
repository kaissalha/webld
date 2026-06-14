import type { PutBlobResult } from "@vercel/blob";
import { upload } from "@vercel/blob/client";

import type { MediaAccess } from "@/constants/upload";

export type ClientUploadPayload = {
	organizationId: string;
	access: MediaAccess;
	maxFileSizeMb: number;
};

type UploadFromClientOptions = {
	pathname: string;
	file: File;
	handleUploadUrl: string;
	payload: ClientUploadPayload;
};

export const uploadFromClient = async ({
	pathname,
	file,
	handleUploadUrl,
	payload,
}: UploadFromClientOptions): Promise<PutBlobResult> =>
	upload(pathname, file, {
		access: payload.access,
		handleUploadUrl,
		clientPayload: JSON.stringify(payload),
	});
