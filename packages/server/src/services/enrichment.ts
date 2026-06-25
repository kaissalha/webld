import { generateText, Output } from "ai";

import { models } from "@webld/ai/models";
import {
	fileClassificationSchema,
	fileClassificationSystemPrompt,
	imageClassificationSchema,
	imageClassificationSystemPrompt,
} from "@webld/ai/prompts";
import { db, fileTagAssignments, fileTags } from "@webld/db";

export type FileClassification = {
	date: string | null;
	language: string | null;
	ocrText: string | null;
	summary: string | null;
	tags: string[];
	title: string | null;
};

const CLASSIFY_SAMPLE_CHARS = 12_000;

/** Classify a text/document file into title, summary, date, language, and tags. */
export const classifyDocumentContent = async ({ text }: { text: string }): Promise<FileClassification> => {
	const sample = text.slice(0, CLASSIFY_SAMPLE_CHARS);

	const { output } = await generateText({
		...models.cheapFast,
		output: Output.object({ schema: fileClassificationSchema }),
		instructions: fileClassificationSystemPrompt,
		messages: [{ role: "user", content: `Document excerpt:\n\n${sample}` }],
	});

	return { ...output, ocrText: null };
};

/** Classify an image via a vision model: title, summary, OCR text, date, language, tags. */
export const classifyImageContent = async ({
	image,
	mediaType,
}: {
	image: Uint8Array;
	mediaType: string;
}): Promise<FileClassification> => {
	const { output } = await generateText({
		...models.vision,
		output: Output.object({ schema: imageClassificationSchema }),
		instructions: imageClassificationSystemPrompt,
		messages: [
			{
				role: "user",
				content: [
					{ type: "text", text: "Analyze this image and extract metadata and any visible text." },
					{ type: "file", data: image, mediaType },
				],
			},
		],
	});

	return output;
};

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/gu, "-")
		.replace(/^-+|-+$/gu, "")
		.slice(0, 64);

/** Upsert organization-scoped tags and assign them to a file. */
export const upsertFileTags = async ({
	fileId,
	organizationId,
	tags,
}: {
	fileId: string;
	organizationId: string;
	tags: string[];
}) => {
	const unique = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));

	if (unique.length === 0) {
		return;
	}

	for (const name of unique) {
		const slug = slugify(name);

		if (!slug) {
			continue;
		}

		const [tag] = await db
			.insert(fileTags)
			.values({ name, organizationId, slug })
			.onConflictDoUpdate({ target: [fileTags.organizationId, fileTags.slug], set: { name } })
			.returning({ id: fileTags.id });

		if (!tag) {
			continue;
		}

		await db.insert(fileTagAssignments).values({ fileId, organizationId, tagId: tag.id }).onConflictDoNothing();
	}
};
