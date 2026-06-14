import { cache } from "react";

import { type inferRouterInputs, type inferRouterOutputs, initTRPC } from "@trpc/server";
import superjson from "superjson";

import { createAppRouter } from "./routers";
import type { CreateStarterTRPCOptions } from "./shared";

export type AppRouter = ReturnType<typeof createAppRouter>;
export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;

export const createStarterTRPC = ({ getSession }: CreateStarterTRPCOptions) => {
	const createTRPCContext = cache(async () => {
		return {
			session: await getSession(),
		};
	});

	const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create({
		transformer: superjson,
	});

	const createTRPCRouter = t.router;

	const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
		if (!ctx.session) {
			throw new Error("Unauthorized");
		}

		return next({
			ctx: {
				session: ctx.session,
			},
		});
	});

	const organizationProcedure = protectedProcedure.use(async ({ ctx, next }) => {
		const activeOrganizationId = ctx.session.session.activeOrganizationId;

		if (!activeOrganizationId) {
			throw new Error("Organization not found");
		}

		return next({
			ctx: {
				session: ctx.session,
				activeOrganizationId,
				user: ctx.session.user,
			},
		});
	});

	const appRouter = createAppRouter({
		createTRPCRouter,
		organizationProcedure,
		protectedProcedure,
	});

	return {
		appRouter,
		createTRPCContext,
		createTRPCRouter,
		protectedProcedure,
		organizationProcedure,
	};
};
