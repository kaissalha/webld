import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { appRouter, createTRPCContext } from "@/server/trpc";

import "server-only";

import { getQueryClient } from "./react-query";

export const trpcServer = createTRPCOptionsProxy({
	ctx: createTRPCContext,
	router: appRouter,
	queryClient: getQueryClient,
});
