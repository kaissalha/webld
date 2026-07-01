"use client";

import { EmailDraftToolOutput } from "./email-draft-tool-output";
import { GenericToolOutput } from "./tool-status-output";

export const ToolOutput = ({ toolName, output }: { toolName: string; output: unknown }) => {
	if (toolName === "composeEmail") {
		return <EmailDraftToolOutput output={output as { address: string; content: string; title: string }} />;
	}

	return <GenericToolOutput toolName={toolName} />;
};
