import type { StarterRouterFactoryOptions } from "../shared";
import { createChatRouter } from "./chat";
import { createContactsRouter } from "./contacts";
import { createGoogleCalendarRouter } from "./google-calendar";
import { createMailRouter } from "./mail";
import { createNotesRouter } from "./notes";

export const createAppRouter = (routerOptions: StarterRouterFactoryOptions) =>
	routerOptions.createTRPCRouter({
		chat: createChatRouter(routerOptions),
		contacts: createContactsRouter(routerOptions),
		googleCalendar: createGoogleCalendarRouter(routerOptions),
		mail: createMailRouter(routerOptions),
		notes: createNotesRouter(routerOptions),
	});
