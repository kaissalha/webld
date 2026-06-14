import { afterEach, describe, expect, it } from "vitest";

import { getBaseURL } from "../src/get-base-url";

const originalWindow = globalThis.window;
const originalEnv = {
	NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF,
	NEXT_PUBLIC_VERCEL_BRANCH_URL: process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL,
	NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
};

const resetEnv = () => {
	if (originalEnv.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF === undefined) {
		delete process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF;
	} else {
		process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF = originalEnv.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF;
	}

	if (originalEnv.NEXT_PUBLIC_VERCEL_BRANCH_URL === undefined) {
		delete process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL;
	} else {
		process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL = originalEnv.NEXT_PUBLIC_VERCEL_BRANCH_URL;
	}

	if (originalEnv.NEXT_PUBLIC_VERCEL_URL === undefined) {
		delete process.env.NEXT_PUBLIC_VERCEL_URL;
	} else {
		process.env.NEXT_PUBLIC_VERCEL_URL = originalEnv.NEXT_PUBLIC_VERCEL_URL;
	}
};

const resetWindow = () => {
	if (originalWindow === undefined) {
		Reflect.deleteProperty(globalThis, "window");
		return;
	}

	Object.defineProperty(globalThis, "window", {
		value: originalWindow,
		writable: true,
		configurable: true,
	});
};

describe("getBaseURL", () => {
	afterEach(() => {
		resetEnv();
		resetWindow();
	});

	it("returns browser origin when window is available", () => {
		Object.defineProperty(globalThis, "window", {
			value: { location: { origin: "https://client.example" } },
			writable: true,
			configurable: true,
		});

		const url = getBaseURL();

		expect(url.toString()).toBe("https://client.example/");
	});

	it("uses production URL when on main branch", () => {
		process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF = "main";

		const url = getBaseURL();

		expect(url.toString()).toBe("https://webld-webapp.vercel.app/");
	});

	it("uses production URL when on master branch", () => {
		process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF = "master";

		const url = getBaseURL();

		expect(url.toString()).toBe("https://webld-webapp.vercel.app/");
	});

	it("uses branch URL when provided", () => {
		process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL = "branch-preview.vercel.app";

		const url = getBaseURL();

		expect(url.toString()).toBe("https://branch-preview.vercel.app/");
	});

	it("prefers main branch URL over other envs", () => {
		process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF = "main";
		process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL = "branch-preview.vercel.app";
		process.env.NEXT_PUBLIC_VERCEL_URL = "preview.vercel.app";

		const url = getBaseURL();

		expect(url.toString()).toBe("https://webld-webapp.vercel.app/");
	});

	it("prefers branch URL over preview URL", () => {
		process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL = "branch-preview.vercel.app";
		process.env.NEXT_PUBLIC_VERCEL_URL = "preview.vercel.app";

		const url = getBaseURL();

		expect(url.toString()).toBe("https://branch-preview.vercel.app/");
	});

	it("uses preview URL when provided", () => {
		process.env.NEXT_PUBLIC_VERCEL_URL = "preview.vercel.app";

		const url = getBaseURL();

		expect(url.toString()).toBe("https://preview.vercel.app/");
	});

	it("ignores blank env vars", () => {
		process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL = "";
		process.env.NEXT_PUBLIC_VERCEL_URL = "";

		const url = getBaseURL();

		expect(url.toString()).toBe("http://localhost:3000/");
	});

	it("falls back when window origin is missing", () => {
		Object.defineProperty(globalThis, "window", {
			value: { location: {} },
			writable: true,
			configurable: true,
		});

		const url = getBaseURL();

		expect(url.toString()).toBe("http://localhost:3000/");
	});

	it("falls back when window origin is malformed", () => {
		Object.defineProperty(globalThis, "window", {
			value: { location: { origin: "not-a-url" } },
			writable: true,
			configurable: true,
		});

		const url = getBaseURL();

		expect(url.toString()).toBe("http://localhost:3000/");
	});

	it("defaults to localhost when no env vars", () => {
		const url = getBaseURL();

		expect(url.toString()).toBe("http://localhost:3000/");
	});
});
