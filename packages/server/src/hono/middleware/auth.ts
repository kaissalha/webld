import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { ApiEnv, AuthenticatedWebldSession, CreateApiAppOptions } from "../context";

export const createRequireAuth = ({ getSession }: CreateApiAppOptions) =>
	createMiddleware<ApiEnv>(async (c, next) => {
		const session = await getSession(c.req.raw.headers);

		if (!session) {
			throw new HTTPException(401, {
				message: "Authentication is required.",
			});
		}

		c.set("session", session);
		await next();
	});

export const requireActiveOrganization = (session: AuthenticatedWebldSession) => {
	const organizationId = session.session.activeOrganizationId;

	if (!organizationId) {
		throw new HTTPException(400, { message: "Organization not found" });
	}

	return organizationId;
};
