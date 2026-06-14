import { initTRPC } from "@trpc/server";
import superjson from "superjson";

export type StarterSession = {
	session: {
		activeOrganizationId?: string | null;
	};
	user: {
		id: string;
		name: string;
		email: string;
	};
} | null;

type StarterTRPCContext = {
	session: StarterSession;
};

const t = initTRPC.context<StarterTRPCContext>().create({
	transformer: superjson,
});

const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.session) {
		throw new Error("Unauthorized");
	}

	return next({
		ctx: {
			session: ctx.session,
		},
	});
});

const organizationProcedure = protectedProcedure.use(({ ctx, next }) => {
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

export type CreateStarterTRPCOptions = {
	getSession: () => Promise<StarterSession>;
};

export type StarterTRPCRouterFactory = typeof t.router;
export type StarterProtectedProcedure = typeof protectedProcedure;
export type StarterOrganizationProcedure = typeof organizationProcedure;

export type StarterRouterFactoryOptions = {
	createTRPCRouter: StarterTRPCRouterFactory;
	organizationProcedure: StarterOrganizationProcedure;
	protectedProcedure: StarterProtectedProcedure;
};
