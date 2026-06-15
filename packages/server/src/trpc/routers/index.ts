import type { WebldRouterFactoryOptions } from "../shared";
import { createChatRouter } from "./chat";
import { createContactsRouter } from "./contacts";

export const createAppRouter = (routerOptions: WebldRouterFactoryOptions) =>
	routerOptions.createTRPCRouter({
		chat: createChatRouter(routerOptions),
		contacts: createContactsRouter(routerOptions),
	});
