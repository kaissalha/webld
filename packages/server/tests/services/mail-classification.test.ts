import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateText, waitUntil } = vi.hoisted(() => ({
	generateText: vi.fn(),
	waitUntil: vi.fn(),
}));

vi.mock("ai", () => ({
	Output: {
		object: vi.fn(({ schema }: { schema: unknown }) => ({ schema })),
	},
	generateText,
}));

vi.mock("@starter/ai/models", () => ({
	models: {
		mailClassification: {
			model: "mail-classification-model",
		},
	},
}));

vi.mock("@vercel/functions", () => ({
	waitUntil,
}));

import { MAIL_CLASSIFICATION_LABELS } from "@starter/app-store";

import {
	applyMailClassificationLabels,
	getMailClassificationLabel,
	serializeMailLabel,
} from "../../src/services/mail-classification";

const waitForBackgroundTasks = async () => {
	await Promise.all(waitUntil.mock.calls.map(([promise]) => promise));
};

describe("mail classification", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("creates missing Gmail labels, classifies unlabeled threads, and patches previews", async () => {
		const getUserLabels = vi.fn().mockResolvedValue([]);
		const createUserLabel = vi.fn(({ backgroundColor, name, textColor }) =>
			Promise.resolve({
				color: {
					backgroundColor,
					textColor,
				},
				id: `label-${name}`,
				name,
			})
		);
		const setThreadLabels = vi.fn().mockResolvedValue(undefined);

		generateText.mockResolvedValue({
			output: {
				classifications: [
					{
						label: "meeting update",
						threadId: "thread-1",
					},
				],
			},
		});

		const threads = await applyMailClassificationLabels({
			connectionEmail: "owner@example.com",
			driver: {
				createUserLabel,
				getUserLabels,
				setThreadLabels,
			} as never,
			folder: "inbox",
			threads: [
				{
					id: "thread-1",
					isStarred: false,
					isUnread: true,
					labelIds: [],
					receivedOn: "2026-04-22T12:00:00.000Z",
					sender: {
						email: "assistant@example.com",
					},
					snippet: "Can we move our meeting to tomorrow afternoon?",
					subject: "Rescheduling tomorrow",
				},
			],
		});

		expect(generateText).toHaveBeenCalledTimes(1);
		expect(setThreadLabels).not.toHaveBeenCalled();
		expect(threads[0]?.classificationLabel?.name).toBe("meeting update");
		expect(threads[0]?.labelIds).toContain("meeting update");

		await waitForBackgroundTasks();

		expect(createUserLabel).toHaveBeenCalledTimes(MAIL_CLASSIFICATION_LABELS.length);
		expect(setThreadLabels).toHaveBeenCalledWith({
			addLabelIds: ["label-meeting update"],
			removeLabelIds: ["label-to respond", "label-fyi", "label-notification", "label-marketing"],
			threadIds: ["thread-1"],
		});
		expect(generateText).toHaveBeenCalledWith(
			expect.objectContaining({
				model: "mail-classification-model",
			})
		);
	});

	it("batches classification label writes by target label when message ids are available", async () => {
		const getUserLabels = vi.fn().mockResolvedValue(
			MAIL_CLASSIFICATION_LABELS.map((labelName) => ({
				id: `label-${labelName}`,
				name: labelName,
			}))
		);
		const createUserLabel = vi.fn();
		const setMessageLabels = vi.fn().mockResolvedValue(undefined);
		const setThreadLabels = vi.fn().mockResolvedValue(undefined);

		generateText.mockResolvedValue({
			output: {
				classifications: [
					{
						label: "marketing",
						threadId: "thread-1",
					},
					{
						label: "marketing",
						threadId: "thread-2",
					},
					{
						label: "notification",
						threadId: "thread-3",
					},
				],
			},
		});

		const threads = await applyMailClassificationLabels({
			connectionEmail: "owner@example.com",
			driver: {
				createUserLabel,
				getUserLabels,
				setMessageLabels,
				setThreadLabels,
			} as never,
			folder: "inbox",
			threads: [
				{
					id: "thread-1",
					isStarred: false,
					isUnread: true,
					labelIds: ["CATEGORY_PROMOTIONS", "INBOX"],
					messageIds: ["msg-1", "msg-2"],
					receivedOn: "2026-04-22T12:00:00.000Z",
					sender: {
						email: "marketing@example.com",
					},
					snippet: "Last chance to save on your plan.",
					subject: "Flash sale",
				},
				{
					id: "thread-2",
					isStarred: false,
					isUnread: true,
					labelIds: ["CATEGORY_PROMOTIONS", "INBOX"],
					messageIds: ["msg-3"],
					receivedOn: "2026-04-22T12:01:00.000Z",
					sender: {
						email: "sales@example.com",
					},
					snippet: "A new offer for your team.",
					subject: "Limited offer",
				},
				{
					id: "thread-3",
					isStarred: false,
					isUnread: true,
					labelIds: ["CATEGORY_UPDATES", "INBOX"],
					messageIds: ["msg-4"],
					receivedOn: "2026-04-22T12:02:00.000Z",
					sender: {
						email: "alerts@example.com",
					},
					snippet: "Your subscription was updated.",
					subject: "Billing notice",
				},
			],
		});

		expect(setThreadLabels).not.toHaveBeenCalled();
		expect(setMessageLabels).not.toHaveBeenCalled();
		expect(threads[0]?.classificationLabel?.name).toBe("marketing");
		expect(threads[0]?.labelIds).toContain("marketing");
		expect(threads[1]?.classificationLabel?.name).toBe("marketing");
		expect(threads[1]?.labelIds).toContain("marketing");
		expect(threads[2]?.classificationLabel?.name).toBe("notification");
		expect(threads[2]?.labelIds).toContain("notification");

		await waitForBackgroundTasks();

		expect(setMessageLabels).toHaveBeenCalledTimes(2);
		expect(setMessageLabels).toHaveBeenCalledWith({
			addLabelIds: ["label-notification"],
			messageIds: ["msg-4"],
			removeLabelIds: ["label-to respond", "label-meeting update", "label-fyi", "label-marketing"],
		});
		expect(setMessageLabels).toHaveBeenCalledWith({
			addLabelIds: ["label-marketing"],
			messageIds: ["msg-1", "msg-2", "msg-3"],
			removeLabelIds: ["label-to respond", "label-meeting update", "label-fyi", "label-notification"],
		});
	});

	it("skips threads that already have a classification label", async () => {
		const getUserLabels = vi.fn().mockResolvedValue([
			{
				color: {
					backgroundColor: "#f2b2a8",
					textColor: "#8a1c0a",
				},
				id: "label-to-respond",
				name: "to respond",
			},
		]);
		const createUserLabel = vi.fn(({ backgroundColor, name, textColor }) =>
			Promise.resolve({
				color: {
					backgroundColor,
					textColor,
				},
				id: `label-${name}`,
				name,
			})
		);
		const setThreadLabels = vi.fn().mockResolvedValue(undefined);

		const threads = await applyMailClassificationLabels({
			connectionEmail: "owner@example.com",
			driver: {
				createUserLabel,
				getUserLabels,
				setThreadLabels,
			} as never,
			folder: "inbox",
			threads: [
				{
					id: "thread-1",
					classificationLabel: {
						backgroundColor: "#f2b2a8",
						id: "to respond",
						name: "to respond",
						textColor: "#8a1c0a",
					},
					isStarred: false,
					isUnread: true,
					labelIds: ["to respond"],
					receivedOn: "2026-04-22T12:00:00.000Z",
					sender: {
						email: "assistant@example.com",
					},
					snippet: "Following up on the proposal.",
					subject: "Need your reply",
				},
			],
		});

		expect(generateText).not.toHaveBeenCalled();
		expect(setThreadLabels).not.toHaveBeenCalled();
		expect(threads[0]?.classificationLabel?.name).toBe("to respond");
	});

	it("skips non-inbox folders entirely", async () => {
		const getUserLabels = vi.fn().mockResolvedValue([]);
		const createUserLabel = vi.fn();
		const setThreadLabels = vi.fn();

		const threads = await applyMailClassificationLabels({
			connectionEmail: "owner@example.com",
			driver: {
				createUserLabel,
				getUserLabels,
				setThreadLabels,
			} as never,
			folder: "sent",
			threads: [
				{
					id: "thread-1",
					isStarred: false,
					isUnread: false,
					labelIds: [],
					receivedOn: "2026-04-22T12:00:00.000Z",
					sender: {
						email: "owner@example.com",
					},
					snippet: "Checking in",
					subject: "Sent reply",
				},
			],
		});

		expect(threads).toEqual([
			{
				id: "thread-1",
				isStarred: false,
				isUnread: false,
				labelIds: [],
				receivedOn: "2026-04-22T12:00:00.000Z",
				sender: {
					email: "owner@example.com",
				},
				snippet: "Checking in",
				subject: "Sent reply",
			},
		]);
		expect(createUserLabel).not.toHaveBeenCalled();
		expect(generateText).not.toHaveBeenCalled();
		expect(setThreadLabels).not.toHaveBeenCalled();
	});

	it("keeps successful thread classifications when one Gmail label write fails", async () => {
		const getUserLabels = vi.fn().mockResolvedValue(
			MAIL_CLASSIFICATION_LABELS.map((labelName) => ({
				id: `label-${labelName}`,
				name: labelName,
			}))
		);
		const createUserLabel = vi.fn();
		const setThreadLabels = vi.fn(({ threadIds }: { threadIds: string[] }) => {
			if (threadIds[0] === "thread-2") {
				return Promise.reject(new Error("Too many concurrent requests for user."));
			}

			return Promise.resolve(undefined);
		});

		generateText.mockResolvedValue({
			output: {
				classifications: [
					{
						label: "marketing",
						threadId: "thread-1",
					},
					{
						label: "notification",
						threadId: "thread-2",
					},
				],
			},
		});

		const threads = await applyMailClassificationLabels({
			connectionEmail: "owner@example.com",
			driver: {
				createUserLabel,
				getUserLabels,
				setThreadLabels,
			} as never,
			folder: "inbox",
			threads: [
				{
					id: "thread-1",
					isStarred: false,
					isUnread: true,
					labelIds: ["CATEGORY_PROMOTIONS", "INBOX"],
					receivedOn: "2026-04-22T12:00:00.000Z",
					sender: {
						email: "marketing@example.com",
					},
					snippet: "Last chance to save on your plan.",
					subject: "Flash sale",
				},
				{
					id: "thread-2",
					isStarred: false,
					isUnread: true,
					labelIds: ["CATEGORY_UPDATES", "INBOX"],
					receivedOn: "2026-04-22T12:01:00.000Z",
					sender: {
						email: "alerts@example.com",
					},
					snippet: "Your subscription was updated.",
					subject: "Billing notice",
				},
			],
		});

		expect(threads[0]?.classificationLabel?.name).toBe("marketing");
		expect(threads[0]?.labelIds).toContain("marketing");
		expect(threads[1]?.classificationLabel?.name).toBe("notification");
		expect(threads[1]?.labelIds).toContain("notification");

		await waitForBackgroundTasks();

		expect(createUserLabel).not.toHaveBeenCalled();
		expect(setThreadLabels).toHaveBeenCalledTimes(2);
	});

	it("falls back when the classifier response omits or duplicates thread ids", async () => {
		const getUserLabels = vi.fn().mockResolvedValue(
			MAIL_CLASSIFICATION_LABELS.map((labelName) => ({
				id: `label-${labelName}`,
				name: labelName,
			}))
		);
		const createUserLabel = vi.fn();
		const setThreadLabels = vi.fn().mockResolvedValue(undefined);

		generateText.mockResolvedValue({
			output: {
				classifications: [
					{
						label: "marketing",
						threadId: "thread-1",
					},
					{
						label: "notification",
						threadId: "thread-1",
					},
				],
			},
		});

		const threads = await applyMailClassificationLabels({
			connectionEmail: "owner@example.com",
			driver: {
				createUserLabel,
				getUserLabels,
				setThreadLabels,
			} as never,
			folder: "inbox",
			threads: [
				{
					id: "thread-1",
					isStarred: false,
					isUnread: true,
					labelIds: [],
					receivedOn: "2026-04-22T12:00:00.000Z",
					sender: {
						email: "marketing@example.com",
					},
					snippet: "Save big this week.",
					subject: "Weekly deals",
				},
				{
					id: "thread-2",
					isStarred: false,
					isUnread: true,
					labelIds: [],
					receivedOn: "2026-04-22T12:01:00.000Z",
					sender: {
						email: "alerts@example.com",
					},
					snippet: "Your account was updated.",
					subject: "Status update",
				},
			],
		});

		expect(createUserLabel).not.toHaveBeenCalled();
		expect(setThreadLabels).not.toHaveBeenCalled();
		expect(threads[0]?.classificationLabel).toBeUndefined();
		expect(threads[1]?.classificationLabel).toBeUndefined();
		expect(threads[0]?.labelIds).toEqual([]);
		expect(threads[1]?.labelIds).toEqual([]);
	});

	it("serializes fallback colors for classification labels and resolves the active label", () => {
		const serializedLabel = serializeMailLabel({
			id: "label-to-respond",
			name: "to respond",
		});

		expect(serializedLabel).toEqual({
			backgroundColor: "#f2b2a8",
			id: "label-to-respond",
			name: "to respond",
			textColor: "#8a1c0a",
		});
		expect(
			getMailClassificationLabel({
				labelIds: ["label-to-respond"],
				labels: [serializedLabel!],
			})
		).toEqual(serializedLabel);
	});
});
