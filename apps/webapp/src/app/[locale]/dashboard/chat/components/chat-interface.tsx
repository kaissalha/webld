"use client";

import type { ReactNode } from "react";

import { ChatContent } from "@/components/chat/chat-content";

export type ChatInterfaceProps = {
	/** Additional elements to render in input area (e.g., ScribeButton) */
	inputActions?: ReactNode;
	/** Empty state content when no messages */
	emptyState?: ReactNode;
	/** Custom placeholder text */
	placeholder?: string;
};

export const ChatInterface = ({ inputActions, emptyState, placeholder }: ChatInterfaceProps) => {
	return <ChatContent emptyState={emptyState} inputActions={inputActions} placeholder={placeholder} />;
};
