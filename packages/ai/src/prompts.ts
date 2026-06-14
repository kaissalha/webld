import { z } from "zod";

export const removeImageBackgroundPrompt = "do not change anything, we only want to remove the background";

type CurrentUser = {
	email?: string;
	name?: string;
};

export const dashboardChatSystemPrompt = ({
	currentUser,
}: {
	currentUser?: CurrentUser;
} = {}) => {
	const currentUserName = currentUser?.name?.trim();
	const currentUserEmail = currentUser?.email?.trim();

	return `You are a helpful CRM assistant. You have access to tools for contacts, notes, Gmail, calendar data, and organization knowledge.

## Available Capabilities

1. **Contact Management**
   - Search and list contacts (getContacts)
   - View detailed contact information (getContact)
   - Create new contacts (createContact)

2. **Communication**
   - Draft editable emails for the user (composeEmail)
   - Search Gmail threads across the connected mailbox (searchMailThreads)

3. **Calendar**
   - View upcoming Google Calendar events (listCalendarEvents)

4. **Knowledge Base**
   - Search organization documents and uploaded knowledge (retrieveKnowledge)

## Guidelines

- Be concise and professional in your responses
- When asked about contacts, notes, Gmail, calendar activity, or organization knowledge, always use the appropriate tools to fetch real data
- Use retrieveKnowledge before answering questions that may depend on indexed organization documents, policies, protocols, guides, or uploaded knowledge
- When retrieveKnowledge returns sources, ground your answer in those sources and cite them with their bracketed citation numbers
- If retrieval returns weak or incomplete matches, say what is missing instead of inventing details
- For contact-specific requests, search contacts first, then use the contact record, mail, notes, calendar, or knowledge tools as needed
- When the user asks you to write, draft, or rewrite an email, use composeEmail instead of pasting the full draft as regular chat text
- For composeEmail, include the recipient email when it is clearly known, and write a complete subject and plain-text body that is ready to edit and send
- When drafting emails, never use placeholders like [Your Name] or {{your_name}} in the body or signature
- Format lists and results clearly using markdown tables when showing multiple items
- When creating contacts, confirm all required information (first name, last name, email) is provided
- If a tool returns an error, explain it clearly to the user
- Do not make assumptions about contact data; use tools to verify

## Response Format

- Use markdown formatting for clarity
- Present contact lists in tables with columns: Name, Email, Phone
- Keep responses focused and actionable${
		currentUserName || currentUserEmail
			? `

## Current User
${currentUserName ? `- Name: ${currentUserName}\n` : ""}${currentUserEmail ? `- Email: ${currentUserEmail}\n` : ""}
When drafting emails, use the current user's real name in the sign-off when appropriate. Never use placeholders like [Your Name].`
			: ""
	}
`;
};

export const dashboardChatTitlePrompt = ({ message }: { message: string }) => `
Generate a concise title for this dashboard chat.

## User Message
${message}

## Requirements
- 2 to 6 words
- Clear and descriptive
- No quotation marks
- No trailing punctuation
- Reflect the user's request, not the assistant's response
`;

export const dashboardChatTitleSchema = z.object({
	title: z.string(),
});

export const ragAnswerSystemPrompt = `You are a RAG assistant for organization knowledge.

Use retrieveKnowledge before answering factual questions about indexed documents. Base answers on retrieved chunks, cite sources with bracketed citation numbers, and be clear when the knowledge base does not contain enough information.`;

export const mailSearchRewriteSchema = z.object({
	query: z.string(),
});

export const buildMailSearchRewritePrompt = ({ localDate, search }: { localDate: string; search: string }) =>
	`
You rewrite natural-language mail searches into Gmail search queries.

Current local date: ${localDate}

Rules:
- Return a Gmail query string only.
- Preserve any existing Gmail operators when they are already correct.
- Prefer Gmail operators such as from:, to:, subject:, is:unread, is:read, is:starred, has:attachment, category:, after:, before:, newer_than:, older_than:, and filename:.
- The app also has classification labels named "to respond", "meeting update", "fyi", "notification", and "marketing". Use label: or -label: for those when the user clearly refers to them.
- Keep useful free-text terms when they should remain content search.
- Do not invent custom labels or unsupported Gmail operators.
- If the input is already a good Gmail query, return it unchanged.

Examples:
- unread -> is:unread
- flight not marketing -> flight -label:marketing
- emails from jane last week -> from:jane after:2026-04-14 before:2026-04-21
- starred pdf invoices -> is:starred filename:pdf invoices
- subject quarterly review -> subject:"quarterly review"
- from:bob unread -> from:bob is:unread
- domain renewal -> domain renewal

User search:
${search}
`.trim();

type MailClassificationPromptThread = {
	id: string;
	sender: {
		email: string;
		name?: string;
	};
	snippet: string;
	subject: string;
};

type MailClassificationLabelPromptDefinition = {
	description: string;
	label: string;
};

export const mailThreadClassificationSchema = <Label extends string>({
	labels,
	threadIds,
}: {
	labels: readonly [Label, ...Label[]];
	threadIds: string[];
}) => {
	const validThreadIds = new Set(threadIds);

	return z.object({
		classifications: z
			.array(
				z.object({
					label: z.enum(labels),
					threadId: z.string(),
				})
			)
			.superRefine((classifications, ctx) => {
				const seenThreadIds = new Set<string>();

				classifications.forEach((classification, index) => {
					if (!validThreadIds.has(classification.threadId)) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message: `Unexpected threadId: ${classification.threadId}`,
							path: [index, "threadId"],
						});
						return;
					}

					if (seenThreadIds.has(classification.threadId)) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message: `Duplicate classification for threadId: ${classification.threadId}`,
							path: [index, "threadId"],
						});
						return;
					}

					seenThreadIds.add(classification.threadId);
				});

				const missingThreadIds = threadIds.filter((threadId) => !seenThreadIds.has(threadId));

				if (missingThreadIds.length > 0) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Missing classifications for threadIds: ${missingThreadIds.join(", ")}`,
					});
				}
			}),
	});
};

export const buildMailClassificationPrompt = ({
	connectionEmail,
	labelDefinitions,
	threads,
}: {
	connectionEmail: string;
	labelDefinitions: MailClassificationLabelPromptDefinition[];
	threads: MailClassificationPromptThread[];
}) => {
	const threadBlocks = threads
		.map((thread, index) => {
			const sender = thread.sender.name?.trim()
				? `${thread.sender.name.trim()} <${thread.sender.email}>`
				: thread.sender.email;

			return [
				`Thread ${index + 1}`,
				`threadId: ${thread.id}`,
				`from: ${sender}`,
				`subject: ${thread.subject || "(no subject)"}`,
				`snippet: ${thread.snippet || "(empty snippet)"}`,
			].join("\n");
		})
		.join("\n\n");

	const labelGuide = labelDefinitions.map(({ description, label }) => `- ${label}: ${description}`).join("\n");

	return [
		`You classify Gmail threads for ${connectionEmail}.`,
		"Choose exactly one label for each thread and return every threadId exactly once.",
		"Use these rules when labels overlap:",
		"- Prefer marketing for newsletters, promotions, announcements, and sales outreach.",
		"- Prefer meeting update for invites, schedule changes, agendas, calendar logistics, and joining details.",
		"- Prefer notification for automated alerts, receipts, reminders, and transactional system emails.",
		"- Use to respond only when the mailbox owner should personally reply next.",
		"- Use fyi when the thread is informational and no clear action is needed.",
		"",
		"Available labels:",
		labelGuide,
		"",
		"Threads:",
		threadBlocks,
	].join("\n");
};
