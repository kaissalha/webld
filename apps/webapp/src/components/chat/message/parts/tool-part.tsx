"use client";

import { BookTextIcon, WrenchIcon } from "lucide-react";
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

	const runningLabel = KNOWLEDGE_TOOLS.has(toolName) ? t("searchingKnowledge") : t("processing");

	const label =
		state === "output-error" ? (
			errorText || t("error")
		) : isRunning ? (
			<TextShimmer className='font-medium'>{runningLabel}</TextShimmer>
		) : (
			formatToolName(toolName)
		);
	const icon = KNOWLEDGE_TOOLS.has(toolName) ? (
		<BookTextIcon className='size-3.5' />
	) : (
		<WrenchIcon className='size-3.5' />
	);
	const status: ChatStepStatus =
		state === "output-error" ? "error" : state === "output-available" ? "done" : "running";

	return <ChatStepItem icon={icon} status={status} isLast={isLast} label={label} />;
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
