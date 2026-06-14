import { tool } from "ai";
import { z } from "zod";

import { listContacts } from "../../services/contacts";
import type { AppContext } from "../types";

const contactSchema = z.object({
	createdAt: z.string(),
	email: z.string(),
	firstName: z.string(),
	id: z.string(),
	lastName: z.string(),
	phoneNumber: z.string().nullable(),
});

export const getContactsTool = tool({
	description:
		"Search and list CRM contacts in the organization. Use this when the user wants to find contacts, see a contact list, or search by name, email, or phone.",
	inputSchema: z.object({
		pageSize: z.number().min(1).max(50).optional().default(10).describe("Number of contacts to return"),
		search: z.string().optional().describe("Search term to filter contacts"),
	}),
	outputSchema: z.object({
		contacts: z.array(contactSchema).optional(),
		error: z.string().optional(),
		hasMore: z.boolean().optional(),
		message: z.string().optional(),
		status: z.enum(["loading", "success", "error"]),
		totalCount: z.number().optional(),
	}),
	async *execute({ pageSize, search }, { experimental_context }) {
		const ctx = experimental_context as AppContext;

		yield { status: "loading", message: "Fetching contacts..." };

		if (!ctx.organizationId) {
			yield { status: "error", error: "Organization context not found" };
			return;
		}

		try {
			const result = await listContacts({
				organizationId: ctx.organizationId,
				pageSize,
				search,
			});

			yield {
				status: "success",
				contacts: result.data.map((contact) => ({
					createdAt: contact.createdAt,
					email: contact.email,
					firstName: contact.firstName,
					id: contact.id,
					lastName: contact.lastName,
					phoneNumber: contact.phoneNumber,
				})),
				hasMore: result.meta.cursor !== null,
				totalCount: result.meta.totalData,
			};
		} catch (error) {
			yield {
				status: "error",
				error: error instanceof Error ? error.message : "Failed to fetch contacts",
			};
		}
	},
});
