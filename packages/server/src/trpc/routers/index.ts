import type { WebldRouterFactoryOptions } from "../shared";
import { createChatRouter } from "./chat";

export const createAppRouter = (routerOptions: WebldRouterFactoryOptions) =>
	routerOptions.createTRPCRouter({
		chat: createChatRouter(routerOptions),
	});
