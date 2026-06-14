"use client";

import { EmailDraftToolOutput } from "./email-draft-tool-output";
import { DATA_TOOL_NAMES } from "./tool-output-helpers";
import { DataToolBadge, GenericToolOutput } from "./tool-status-output";

export const ToolOutput = ({ toolName, output }: { toolName: string; output: unknown }) => {
	if (toolName === "composeEmail") {
		return <EmailDraftToolOutput output={output as { address: string; content: string; title: string }} />;
	}

	if (DATA_TOOL_NAMES.has(toolName)) {
		return <DataToolBadge toolName={toolName} />;
	}

	return <GenericToolOutput toolName={toolName} />;
};
