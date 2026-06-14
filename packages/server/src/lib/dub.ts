import { Dub } from "dub";

const isProduction = process.env.VERCEL_ENV === "production";

export const dubClient =
	isProduction &&
	new Dub({
		token: process.env.DUB_API_KEY,
	});
