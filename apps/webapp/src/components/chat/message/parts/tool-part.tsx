"use client";

import type { ReactNode } from "react";

import { BookTextIcon, UsersIcon, WrenchIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { TextShimmer } from "@webld/ui/components/text-shimmer";

import { ChatStepItem, type ChatStepStatus } from "../chat-step-item";
import { ToolOutput } from "./tool-output";
import { formatToolName } from "./tool-output-helpers";
import type { ToolState } from "./tool-part-types";
import { ToolError, ToolLoading } from "./tool-status-output";
import { WebSearchTool } from "./web-search-tool";

export type ToolPartProps = {
	toolName: string;
	toolCallId: string;
	state: ToolState;
	input?: Record<string, unknown>;
	output?: unknown;
	errorText?: string;
	isLast?: boolean;
};

const KNOWLEDGE_TOOLS = new Set(["retrieveKnowledge", "getKnowledgeContent"]);
const CONTACT_TOOLS = new Set(["createContact", "getContact", "getContacts"]);

const getToolIcon = (toolName: string): ReactNode => {
	if (KNOWLEDGE_TOOLS.has(toolName)) {
		return <BookTextIcon className='size-3.5' />;
	}
	if (CONTACT_TOOLS.has(toolName)) {
		return <UsersIcon className='size-3.5' />;
	}

	return <WrenchIcon className='size-3.5' />;
};

const getStepStatus = (state: ToolState): ChatStepStatus => {
	if (state === "output-error") {
		return "error";
	}
	if (state === "output-available") {
		return "done";
	}

	return "running";
};

const GenericToolStep = ({
	toolName,
	state,
	errorText,
	isLast,
}: {
	toolName: string;
	state: ToolState;
	errorText?: string;
	isLast: boolean;
}) => {
	const t = useTranslations("components.chat.message.tool");
	const isRunning = state === "input-streaming" || state === "input-available";

	const runningLabel = KNOWLEDGE_TOOLS.has(toolName)
		? t("searchingKnowledge")
		: CONTACT_TOOLS.has(toolName)
			? t("lookingUpContacts")
			: t("processing");

	const label =
		state === "output-error" ? (
			errorText || t("error")
		) : isRunning ? (
			<TextShimmer className='font-medium'>{runningLabel}</TextShimmer>
		) : (
			formatToolName(toolName)
		);

	return <ChatStepItem icon={getToolIcon(toolName)} status={getStepStatus(state)} isLast={isLast} label={label} />;
};

export const ToolPart = ({
	toolName,
	toolCallId: _toolCallId,
	state,
	input,
	output,
	errorText,
	isLast = false,
}: ToolPartProps) => {
	const t = useTranslations("components.chat.message.tool");

	if (toolName === "webSearch") {
		return <WebSearchTool state={state} input={input} output={output} errorText={errorText} isLast={isLast} />;
	}

	// The email draft is an editable result, not a timeline step, so it renders on its own.
	if (toolName === "composeEmail") {
		switch (state) {
			case "input-streaming":
			case "input-available":
				return <ToolLoading message={t("draftingEmail")} />;
			case "output-available":
				return <ToolOutput toolName={toolName} output={output} />;
			case "output-error":
				return <ToolError errorText={errorText} />;
			default:
				return null;
		}
	}

	return <GenericToolStep toolName={toolName} state={state} errorText={errorText} isLast={isLast} />;
};

ToolPart.displayName = "ToolPart";
