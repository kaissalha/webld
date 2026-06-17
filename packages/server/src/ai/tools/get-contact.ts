import { tool } from "ai";
import { z } from "zod";

import { getContact } from "../../services/contacts";
import { appContextSchema } from "../types";

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
	contextSchema: appContextSchema,
	inputSchema: z.object({
		contactId: z.string().describe("The unique identifier of the contact"),
	}),
	outputSchema: z.object({
		contact: contactSchema.optional(),
		error: z.string().optional(),
		message: z.string().optional(),
		status: z.enum(["loading", "success", "error"]),
	}),
	async *execute({ contactId }, { context }) {
		yield { status: "loading", message: "Fetching contact details..." };

		if (!context.organizationId) {
			yield { status: "error", error: "Organization context not found" };
			return;
		}

		try {
			const contact = await getContact({
				id: contactId,
				organizationId: context.organizationId,
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
