import { headers } from "next/headers";

import { z } from "zod";

import { listMailThreads } from "@starter/server";
import { auth } from "@starter/server/auth";

const MailThreadListRequestSchema = z.object({
	classifyUnlabeled: z.boolean().optional(),
	connectionId: z.string(),
	folder: z.enum(["inbox", "sent", "drafts", "starred", "trash"]).optional(),
	maxResults: z.number().min(1).max(100).optional(),
	pageToken: z.string().optional(),
	query: z.string().optional(),
});

export const POST = async (request: Request) => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.session.activeOrganizationId) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const activeOrganizationId = session.session.activeOrganizationId;
	const input = MailThreadListRequestSchema.parse(await request.json());
	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		async start(controller) {
			try {
				for await (const chunk of listMailThreads({
					...input,
					organizationId: activeOrganizationId,
				})) {
					controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`));
				}
			} catch (error) {
				controller.enqueue(
					encoder.encode(
						`${JSON.stringify({
							message: error instanceof Error ? error.message : "Failed to stream mail threads",
							type: "error",
						})}\n`
					)
				);
			} finally {
				controller.close();
			}
		},
	});

	return new Response(stream, {
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": "application/x-ndjson; charset=utf-8",
		},
	});
};
