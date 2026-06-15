import type { NextRequest } from "next/server";

const firstNonEmpty = (...values: Array<string | null | undefined>) => {
	for (const value of values) {
		if (typeof value === "string" && value.trim() !== "") {
			return value;
		}
	}

	return null;
};

export const DEFAULT_MATCHED_PATH_HEADERS = [
	"x-matched-path",
	"x-vercel-original-path",
	"x-original-path",
	"x-rewrite-path",
] as const;

type ResolveRequestPathOptions = {
	pathHeaderName?: string;
	queryParamName?: string;
	matchedPathHeaders?: readonly string[];
	handlerPath?: string;
};

export const resolveRequestPath = (
	request: NextRequest,
	{
		pathHeaderName,
		queryParamName,
		matchedPathHeaders = DEFAULT_MATCHED_PATH_HEADERS,
		handlerPath,
	}: ResolveRequestPathOptions = {}
) => {
	const pathFromHeader = pathHeaderName ? request.headers.get(pathHeaderName) : null;
	const pathFromQuery = queryParamName ? request.nextUrl.searchParams.get(queryParamName) : null;
	const pathFromMatchedHeader = firstNonEmpty(...matchedPathHeaders.map((header) => request.headers.get(header)));
	const pathname = request.nextUrl.pathname;

	let path = firstNonEmpty(pathFromHeader, pathFromMatchedHeader, pathFromQuery);

	if (!path && handlerPath && pathname.startsWith(`${handlerPath}/`)) {
		path = pathname.slice(handlerPath.length);
		if (path === "") {
			path = "/";
		}
	}

	if (!path) {
		path = handlerPath && pathname === handlerPath ? null : pathname;
	}

	if (!path || (handlerPath && path === handlerPath)) {
		path = "/";
	}

	if (!path.startsWith("/")) {
		path = `/${path}`;
	}

	return path;
};

export const isPathExcluded = (path: string, excludedPrefixes: readonly string[]) =>
	excludedPrefixes.some((prefix) => path.startsWith(prefix));
