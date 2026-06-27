"use client";

import { useTranslations } from "next-intl";

import { ToolOutput } from "./tool-output";
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
};

export const ToolPart = ({ toolName, toolCallId: _toolCallId, state, input, output, errorText }: ToolPartProps) => {
	const t = useTranslations("components.chat.message.tool");

	if (toolName === "webSearch") {
		return <WebSearchTool state={state} input={input} output={output} errorText={errorText} />;
	}

	switch (state) {
		case "input-streaming":
			return <ToolLoading message={t("inputStreaming")} />;

		case "input-available":
			return <ToolLoading message={t("processing")} />;

		case "output-available":
			return <ToolOutput toolName={toolName} output={output} />;

		case "output-error":
			return <ToolError errorText={errorText} />;

		default:
			return null;
	}
};

ToolPart.displayName = "ToolPart";
