import { tool } from "ai";
import { z } from "zod";

import { createContact } from "../../services/contacts";
import { appContextSchema } from "../types";

const contactSchema = z.object({
	createdAt: z.string(),
	email: z.string(),
	firstName: z.string(),
	id: z.string(),
	lastName: z.string(),
	phoneNumber: z.string().nullable(),
});

export const createContactTool = tool({
	description: "Create a CRM contact in the organization. Requires first name, last name, and email.",
	contextSchema: appContextSchema,
	inputSchema: z.object({
		email: z.email().describe("The contact's email address"),
		firstName: z.string().describe("The contact's first name"),
		lastName: z.string().describe("The contact's last name"),
		phoneNumber: z.string().optional().describe("The contact's phone number"),
	}),
	outputSchema: z.object({
		contact: contactSchema.optional(),
		error: z.string().optional(),
		message: z.string().optional(),
		status: z.enum(["loading", "success", "error"]),
	}),
	async *execute({ email, firstName, lastName, phoneNumber }, { context }) {
		yield { status: "loading", message: `Creating contact ${firstName} ${lastName}...` };

		if (!context.organizationId) {
			yield { status: "error", error: "Organization context not found" };
			return;
		}

		try {
			const contact = await createContact({
				email,
				firstName,
				lastName,
				organizationId: context.organizationId,
				phoneNumber,
			});

			yield {
				status: "success",
				contact: {
					createdAt: contact.createdAt,
					email: contact.email,
					firstName: contact.firstName,
					id: contact.id,
					lastName: contact.lastName,
					phoneNumber: contact.phoneNumber,
				},
				message: `Created contact ${firstName} ${lastName}`,
			};
		} catch (error) {
			yield {
				status: "error",
				error: error instanceof Error ? error.message : "Failed to create contact",
			};
		}
	},
});
