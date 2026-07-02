import { handle } from "hono/vercel";

import { apiApp } from "@/server/hono";

const handler = handle(apiApp);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
