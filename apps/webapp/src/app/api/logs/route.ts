import { z } from "zod";

import { logger } from "@starter/logger/server";

const logPayloadSchema = z.object({
	level: z.enum(["debug", "info", "warn", "error"]),
	message: z.string().min(1),
	metadata: z.record(z.string(), z.unknown()).optional(),
	error: z.unknown().optional(),
});

export const POST = async (request: Request) => {
	try {
		const payload = logPayloadSchema.parse(await request.json());

		if (payload.level === "error") {
			logger.error({
				message: payload.message,
				metadata: payload.metadata,
				error: payload.error,
			});
		} else {
			logger.log({
				level: payload.level,
				message: payload.message,
				metadata: payload.metadata,
			});
		}

		return new Response(null, {
			status: 204,
		});
	} catch (error) {
		logger.error({
			message: "Invalid client log payload",
			error,
		});

		return Response.json(
			{
				error: "Invalid log payload",
			},
			{
				status: 400,
			}
		);
	}
};
