import { useState } from "react";

import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BaseChatUIMessage } from "@webld/server";

import { type UseAutoResumeParams, useAutoResume } from "../../src/hooks/chat/use-auto-resume";

const createTextMessage = ({
	id,
	role,
	text,
}: {
	id: string;
	role: "user" | "assistant";
	text: string;
}): BaseChatUIMessage => {
	return {
		id,
		role,
		parts: [{ type: "text", text }],
	} as BaseChatUIMessage;
};

describe("useAutoResume", () => {
	it("resumes when the most recent initial message is from the user", async () => {
		const resumeStream = vi.fn();
		const initialMessages = [createTextMessage({ id: "user-1", role: "user", text: "Hello" })];

		renderHook(() => {
			const [, setMessages] = useState(initialMessages);

			useAutoResume({
				autoResume: true,
				initialMessages,
				data: [],
				resumeStream,
				setMessages,
			});
		});

		await waitFor(() => {
			expect(resumeStream).toHaveBeenCalledTimes(1);
		});
	});

	it("appends resumable messages idempotently", async () => {
		const initialMessages = [createTextMessage({ id: "user-1", role: "user", text: "Hello" })];
		const appendedMessage = createTextMessage({ id: "assistant-1", role: "assistant", text: "Hi there" });

		const { result, rerender } = renderHook(
			({ data }: { data: unknown[] }) => {
				const [messages, setMessages] = useState(initialMessages);

				useAutoResume({
					autoResume: false,
					initialMessages,
					data: data as UseAutoResumeParams<BaseChatUIMessage>["data"],
					resumeStream: vi.fn(),
					setMessages,
				});

				return messages;
			},
			{
				initialProps: {
					data: [] as unknown[],
				},
			}
		);

		rerender({
			data: [{ type: "data-append-message", data: JSON.stringify(appendedMessage) }],
		});

		await waitFor(() => {
			expect(result.current).toHaveLength(2);
		});

		rerender({
			data: [{ type: "data-append-message", data: JSON.stringify(appendedMessage) }],
		});

		await waitFor(() => {
			expect(result.current).toHaveLength(2);
			expect(result.current[1]?.id).toBe(appendedMessage.id);
		});
	});
});
