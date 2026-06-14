import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@starter/server/auth";

export const { GET, POST } = toNextJsHandler(auth);
