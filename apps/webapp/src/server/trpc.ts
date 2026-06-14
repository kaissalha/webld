import { headers } from "next/headers";

import { createStarterTRPC } from "@starter/server";
import { auth } from "@starter/server/auth";

const trpc = createStarterTRPC({
	getSession: async () =>
		auth.api.getSession({
			headers: await headers(),
		}),
});

export const { appRouter, createTRPCContext, createTRPCRouter, protectedProcedure, organizationProcedure } = trpc;
