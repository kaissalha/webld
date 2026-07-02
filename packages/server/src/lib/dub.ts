import { Dub } from "dub";

export const dubClient =
	process.env.VERCEL_ENV === "production" &&
	new Dub({
		token: process.env.DUB_API_KEY,
	});
