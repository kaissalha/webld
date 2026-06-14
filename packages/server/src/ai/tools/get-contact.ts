import { tool } from "ai";
import { z } from "zod";

import { getContact } from "../../services/contacts";
import type { AppContext } from "../types";

const contactSchema = z.object({
	createdAt: z.string(),
	email: z.string(),
	firstName: z.string(),
	id: z.string(),
	lastName: z.string(),
	phoneNumber: z.string().nullable(),
	updatedAt: z.string(),
});

export const getContactTool = tool({
	description: "Get detailed information about a CRM contact by ID.",
	inputSchema: z.object({
		contactId: z.string().describe("The unique identifier of the contact"),
	}),
	outputSchema: z.object({
		contact: contactSchema.optional(),
		error: z.string().optional(),
		message: z.string().optional(),
		status: z.enum(["loading", "success", "error"]),
	}),
	async *execute({ contactId }, { experimental_context }) {
		const ctx = experimental_context as AppContext;

		yield { status: "loading", message: "Fetching contact details..." };

		if (!ctx.organizationId) {
			yield { status: "error", error: "Organization context not found" };
			return;
		}

		try {
			const contact = await getContact({
				id: contactId,
				organizationId: ctx.organizationId,
			});

			if (!contact) {
				yield { status: "error", error: "Contact not found" };
				return;
			}

			yield {
				status: "success",
				contact: {
					createdAt: contact.createdAt,
					email: contact.email,
					firstName: contact.firstName,
					id: contact.id,
					lastName: contact.lastName,
					phoneNumber: contact.phoneNumber,
					updatedAt: contact.updatedAt,
				},
			};
		} catch (error) {
			yield {
				status: "error",
				error: error instanceof Error ? error.message : "Failed to fetch contact",
			};
		}
	},
});
