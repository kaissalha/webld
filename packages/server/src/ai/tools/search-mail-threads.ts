import { tool } from "ai";
import { z } from "zod";

import { listMailThreads, readInitialMailThreadListPage } from "../../services/mail";
import type { AppContext } from "../types";

const mailThreadSchema = z.object({
	id: z.string(),
	isStarred: z.boolean(),
	isUnread: z.boolean(),
	receivedOn: z.string(),
	senderEmail: z.string(),
	senderName: z.string().nullable(),
	snippet: z.string().nullable(),
	subject: z.string().nullable(),
});

export const searchMailThreadsTool = tool({
	description:
		"Search Gmail threads for the organization. Use this when the user asks about inbox activity, recent emails, or wants to search Gmail by sender or text.",
	inputSchema: z.object({
		folder: z.string().optional().default("inbox").describe("Mail folder to search, such as inbox or all"),
		maxResults: z.number().min(1).max(20).optional().default(10).describe("How many threads to return"),
		query: z.string().optional().describe("Optional Gmail search query"),
	}),
	outputSchema: z.object({
		connectionEmail: z.string().optional(),
		error: z.string().optional(),
		message: z.string().optional(),
		status: z.enum(["loading", "success", "error"]),
		threads: z.array(mailThreadSchema).optional(),
		totalCount: z.number().optional(),
	}),
	async *execute({ folder, maxResults, query }, { experimental_context }) {
		const ctx = experimental_context as AppContext;

		yield { status: "loading", message: "Searching mail threads..." };

		if (!ctx.organizationId) {
			yield { status: "error", error: "Organization context not found" };
			return;
		}

		try {
			const result = await readInitialMailThreadListPage({
				stream: listMailThreads({
					folder,
					maxResults,
					organizationId: ctx.organizationId,
					query,
				}),
			});

			if (!result) {
				yield {
					status: "success",
					threads: [],
					totalCount: 0,
				};
				return;
			}

			yield {
				status: "success",
				connectionEmail: result.connectionEmail,
				threads: result.threads.map((thread) => ({
					id: thread.id,
					isStarred: thread.isStarred,
					isUnread: thread.isUnread,
					receivedOn: thread.receivedOn,
					senderEmail: thread.sender.email,
					senderName: thread.sender.name ?? null,
					snippet: thread.snippet || null,
					subject: thread.subject || null,
				})),
				totalCount: result.threads.length,
			};
		} catch (error) {
			yield {
				status: "error",
				error: error instanceof Error ? error.message : "Failed to search mail threads",
			};
		}
	},
});
