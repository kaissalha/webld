import { del, get, put, type PutBlobResult } from "@vercel/blob";
import { handleUpload, type HandleUploadBody, type HandleUploadOptions } from "@vercel/blob/client";
import { v4 as uuidv4 } from "uuid";

import { type MediaAccess, mediaAccessValues } from "@/constants/upload";
import { parseJsonRecord } from "@/utils/parse-json-payload";
import { logger } from "@webld/logger/server";

type PutBase64Options = {
	prefix?: string;
	access?: MediaAccess;
};

type HandleClientUploadOptions = {
	body: HandleUploadBody;
	request: Request;
	onBeforeGenerateToken: HandleUploadOptions["onBeforeGenerateToken"];
	onUploadCompleted?: HandleUploadOptions["onUploadCompleted"];
};

type GetBlobOptions = {
	pathname: string;
	access: MediaAccess;
	ifNoneMatch?: string;
};

const isBlobMediaAccess = (value: unknown): value is MediaAccess =>
	typeof value === "string" && mediaAccessValues.includes(value as MediaAccess);

const readAccessFromHandleUploadBody = (body: HandleUploadBody): MediaAccess => {
	if (body.type === "blob.generate-client-token") {
		const payload = parseJsonRecord(body.payload.clientPayload);
		return isBlobMediaAccess(payload.access) ? payload.access : "public";
	}

	const payload = parseJsonRecord(body.payload.tokenPayload);
	return isBlobMediaAccess(payload.access) ? payload.access : "public";
};

const getBlobTokenForAccess = (access: MediaAccess): string | undefined => {
	if (access === "public") {
		const publicToken = process.env.BLOB_PUBLIC_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
		if (!publicToken) {
			throw new Error(
				"BLOB_PUBLIC_READ_WRITE_TOKEN or BLOB_READ_WRITE_TOKEN is required for public blob operations."
			);
		}
		return publicToken;
	}

	const privateToken = process.env.BLOB_READ_WRITE_TOKEN;
	if (!privateToken) {
		throw new Error("BLOB_READ_WRITE_TOKEN is required for private blob operations.");
	}
	return privateToken;
};

const getFileExtensionFromMediaType = (mediaType: string): string => {
	const normalizedMediaType = mediaType.split(";")[0]?.trim().toLowerCase();
	if (!normalizedMediaType) {
		return "bin";
	}

	const fallbackSubtype = normalizedMediaType.split("/")[1];
	if (!fallbackSubtype) {
		return "bin";
	}

	return fallbackSubtype.split("+")[0] || "bin";
};

export const uploadBufferToBlob = async (
	buffer: Buffer,
	mediaType: string,
	options: PutBase64Options = {}
): Promise<PutBlobResult> => {
	const access = options.access ?? "public";
	const ext = getFileExtensionFromMediaType(mediaType);
	const key = `${process.env.VERCEL_ENV ?? "development"}/${options.prefix ?? ""}${uuidv4()}.${ext}`;

	try {
		const blob = await put(key, buffer, {
			access,
			contentType: mediaType,
			addRandomSuffix: true,
			token: getBlobTokenForAccess(access),
		});

		return blob;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		logger.error({
			error,
			message: "Failed to upload media to Blob",
			metadata: {
				error: errorMessage,
				mediaType,
				key,
				access,
			},
		});
		throw new Error(`Failed to upload media to Blob: ${errorMessage}`);
	}
};

export const uploadBase64ToBlob = (
	base64Data: string,
	mediaType: string,
	options: PutBase64Options = {}
): Promise<PutBlobResult> => uploadBufferToBlob(Buffer.from(base64Data, "base64"), mediaType, options);

export const handleClientUpload = async ({
	body,
	request,
	onBeforeGenerateToken,
	onUploadCompleted,
}: HandleClientUploadOptions) => {
	const access = readAccessFromHandleUploadBody(body);

	return handleUpload({
		body,
		request,
		token: getBlobTokenForAccess(access),
		onBeforeGenerateToken,
		onUploadCompleted,
	});
};

export const getBlob = async ({ pathname, access, ifNoneMatch }: GetBlobOptions) => {
	const normalizedPathname = pathname.replace(/^\/+/, "");
	if (!normalizedPathname) {
		return null;
	}

	return get(normalizedPathname, {
		access,
		ifNoneMatch,
		token: getBlobTokenForAccess(access),
	});
};

export const downloadBlob = async ({ url, access }: { url: string; access: MediaAccess }) => {
	const blob = await get(url, {
		access,
		token: getBlobTokenForAccess(access),
	});

	if (!blob?.stream || blob.statusCode !== 200) {
		throw new Error(`Failed to download blob: ${url}`);
	}

	return {
		body: Buffer.from(await new Response(blob.stream).arrayBuffer()),
		blob: blob.blob,
	};
};

export const deleteBlob = async ({ url, access }: { url: string; access: MediaAccess }) => {
	await del(url, {
		token: getBlobTokenForAccess(access),
	});
};
