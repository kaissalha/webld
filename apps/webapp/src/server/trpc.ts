import { headers } from "next/headers";

import { createTRPC } from "@webld/server";
import { auth } from "@webld/server/auth";

const trpc = createTRPC({
	getSession: async () =>
		auth.api.getSession({
			headers: await headers(),
		}),
});

export const { appRouter, createTRPCContext, createTRPCRouter, protectedProcedure, organizationProcedure } = trpc;
