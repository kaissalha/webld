import { z } from "@hono/zod-openapi";

export const errorResponseSchema = z
	.object({
		error: z.object({
			message: z.string().openapi({
				example: "Authentication is required.",
			}),
			issues: z
				.array(
					z.object({
						path: z.string().openapi({ example: "message.id" }),
						message: z.string().openapi({ example: "Invalid input" }),
					})
				)
				.optional()
				.openapi({ description: "Field-level validation issues, present on validation errors." }),
		}),
	})
	.openapi("ErrorResponse");

export const errorResponse = (description: string) => ({
	description,
	content: {
		"application/json": {
			schema: errorResponseSchema,
		},
	},
});

export const uiMessageSchema = z
	.looseObject({
		id: z.string().min(1),
		role: z.enum(["system", "user", "assistant"]),
		parts: z.array(z.looseObject({ type: z.string() })),
	})
	.openapi("UIMessage", {
		description: "An AI SDK UI message. Additional part-specific fields are passed through as-is.",
	});

export const documentSchema = z
	.object({
		id: z.uuid(),
		organizationId: z.string(),
		name: z.string(),
		url: z.string().nullable(),
		contentType: z.string(),
		sizeBytes: z.number().nullable(),
		access: z.enum(["public", "private"]),
		kind: z.enum(["document", "image", "text", "audio", "video", "other"]),
		sourceType: z.enum(["upload", "text", "url"]),
		ragStatus: z.enum(["none", "pending", "ready", "failed"]),
		processingError: z.string().nullable(),
		title: z.string().nullable(),
		summary: z.string().nullable(),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.openapi("Document");

export const urlMetadataSchema = z
	.object({
		title: z.string().openapi({
			example: "webld",
		}),
		description: z.string().openapi({
			example: "Build and operate AI-native web experiences.",
		}),
		siteName: z.string().openapi({
			example: "webld",
		}),
		favicon: z.url().nullable().openapi({
			example: "https://www.webld.dev/favicon.ico",
		}),
		url: z.url().openapi({
			example: "https://www.webld.dev",
		}),
	})
	.openapi("UrlMetadata");

export const linkPreviewResponseSchema = urlMetadataSchema.nullable();

export type LinkPreviewResponse = z.infer<typeof linkPreviewResponseSchema>;
export type DocumentResponse = z.infer<typeof documentSchema>;
