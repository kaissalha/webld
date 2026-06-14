import { headers } from "next/headers";

import { createWebldTRPC } from "@webld/server";
import { auth } from "@webld/server/auth";

const trpc = createWebldTRPC({
	getSession: async () =>
		auth.api.getSession({
			headers: await headers(),
		}),
});

export const { appRouter, createTRPCContext, createTRPCRouter, protectedProcedure, organizationProcedure } = trpc;
