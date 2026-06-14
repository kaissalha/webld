import { initTRPC } from "@trpc/server";
import superjson from "superjson";

export type webldSession = {
	session: {
		activeOrganizationId?: string | null;
	};
	user: {
		id: string;
		name: string;
		email: string;
	};
} | null;

type webldTRPCContext = {
	session: webldSession;
};

const t = initTRPC.context<webldTRPCContext>().create({
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

export type CreateWebldTRPCOptions = {
	getSession: () => Promise<webldSession>;
};

export type webldTRPCRouterFactory = typeof t.router;
export type webldProtectedProcedure = typeof protectedProcedure;
export type webldOrganizationProcedure = typeof organizationProcedure;

export type WebldRouterFactoryOptions = {
	createTRPCRouter: webldTRPCRouterFactory;
	organizationProcedure: webldOrganizationProcedure;
	protectedProcedure: webldProtectedProcedure;
};
