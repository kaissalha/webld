import type { CreateApiAppOptions } from "../context";
import { createApiRouter } from "../router";

/**
 * Better Auth owns every endpoint under /auth (sign-in, sign-up, OAuth,
 * two-factor, organizations, ...). They are intentionally excluded from the
 * OpenAPI document; the generated SDK targets the product API only.
 */
export const createAuthRoutes = (options: CreateApiAppOptions) =>
	createApiRouter().on(["GET", "POST"], "/auth/*", (c) => options.handleAuth(c.req.raw));
