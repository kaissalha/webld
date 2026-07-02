import { after } from "next/server";

import { start } from "workflow/api";

import { streamContext } from "@/server/stream-context";
import { ingestFileWorkflow } from "@/workflows/ingest-file";
import { auth } from "@webld/server/auth";
import { createApiApp } from "@webld/server/hono";

export const apiApp = createApiApp({
	handleAuth: (request) => auth.handler(request),
	getSession: (requestHeaders) =>
		auth.api.getSession({
			headers: requestHeaders,
		}),
	scheduleAfter: (task) => after(task),
	startIngestFile: async (input) => {
		const run = await start(ingestFileWorkflow, [input]);
		return { runId: run.runId };
	},
	streamContext,
});
