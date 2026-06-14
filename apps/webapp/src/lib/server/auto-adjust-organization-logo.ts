import type { MediaAccess } from "@/constants/upload";
import { createStorageRecord } from "@/services/storage";
import { logger } from "@starter/logger/server";

import { removeImageBackground } from "./remove-image-background";
import { hasTransparentPixels, trimAndPadTransparentImage } from "./sharp-image-processing";
import { downloadBlob, uploadBase64ToBlob } from "./storage";

const normalizeStoredContentType = (contentType: string) => {
	const base = contentType.split(";")[0]?.trim();
	return base && base.length > 0 ? base : "application/octet-stream";
};

const fetchPublicImage = async (imageUrl: string) => {
	const response = await fetch(imageUrl);
	if (!response.ok) {
		throw new Error(`Failed to fetch source image: ${response.status}`);
	}

	const arrayBuffer = await response.arrayBuffer();
	return {
		buffer: Buffer.from(arrayBuffer),
	};
};

const loadSourceImage = async (imageUrl: string, access: MediaAccess) => {
	if (access === "private") {
		const { body } = await downloadBlob({ url: imageUrl, access: "private" });
		return {
			buffer: body,
		};
	}

	return fetchPublicImage(imageUrl);
};

export const autoAdjustLogoBuffer = async ({ buffer }: { buffer: Buffer }) => {
	const isTransparent = await hasTransparentPixels(buffer);

	const trimmedBuffer = isTransparent
		? await trimAndPadTransparentImage({ buffer })
		: await (async () => {
				const backgroundRemoved = await removeImageBackground({
					buffer,
				});

				return trimAndPadTransparentImage({
					buffer: Buffer.from(backgroundRemoved.base64, "base64"),
				});
			})();

	return {
		buffer: trimmedBuffer,
		mediaType: "image/png",
	};
};

export const processAndStoreAutoAdjustedOrganizationLogo = async ({
	organizationId,
	sourceImageUrl,
	storedAccess,
}: {
	organizationId: string;
	sourceImageUrl: string;
	storedAccess: MediaAccess;
}) => {
	try {
		const { buffer } = await loadSourceImage(sourceImageUrl, storedAccess);

		const { buffer: processedBuffer, mediaType } = await autoAdjustLogoBuffer({
			buffer,
		});

		const uploaded = await uploadBase64ToBlob(processedBuffer.toString("base64"), mediaType, {
			prefix: `organizations/${organizationId}/logos/`,
			access: storedAccess,
		});

		await createStorageRecord({
			organizationId,
			url: uploaded.url,
			contentType: normalizeStoredContentType(uploaded.contentType ?? mediaType),
			access: storedAccess,
		});

		return { url: uploaded.url };
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		logger.error({
			error,
			message: "Failed to auto-adjust organization logo",
			metadata: {
				organizationId,
				sourceImageUrl,
				detail: message,
			},
		});
		throw error;
	}
};
