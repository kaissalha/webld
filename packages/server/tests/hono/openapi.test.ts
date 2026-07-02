import { describe, expect, it } from "vitest";

import { createApiApp } from "../../src/hono/app";
import type { CreateApiAppOptions } from "../../src/hono/context";

const HTTP_METHODS = ["get", "put", "post", "delete", "patch"] as const;

type OperationObject = {
	operationId?: string;
	tags?: string[];
	security?: Array<Record<string, string[]>>;
	summary?: string;
	responses?: Record<string, { content?: Record<string, { schema?: { $ref?: string } }> }>;
};

const createTestApp = () =>
	createApiApp({
		getSession: async () => null,
		handleAuth: () => new Response(null, { status: 404 }),
		scheduleAfter: () => {},
		startIngestFile: async () => ({ runId: "test-run" }),
		streamContext: {
			resumableStream: async () => null,
		},
	} satisfies CreateApiAppOptions);

const getSpec = async () => {
	const app = createTestApp();
	const response = await app.request("/api/openapi.json");

	expect(response.status).toBe(200);

	return (await response.json()) as {
		openapi: string;
		info: { title: string; version: string };
		tags?: Array<{ name: string }>;
		paths: Record<string, Record<string, OperationObject>>;
		components?: { securitySchemes?: Record<string, unknown>; schemas?: Record<string, unknown> };
	};
};

const getOperations = (spec: Awaited<ReturnType<typeof getSpec>>) =>
	Object.entries(spec.paths).flatMap(([path, pathItem]) =>
		HTTP_METHODS.flatMap((method) => {
			const operation = pathItem[method];

			return operation ? [{ path, method, operation }] : [];
		})
	);

describe("OpenAPI document", () => {
	it("is an OpenAPI 3.1 document with servers and tags", async () => {
		const spec = await getSpec();

		expect(spec.openapi).toBe("3.1.0");
		expect(spec.info.title).toBe("webld API");
		expect(spec.tags?.length).toBeGreaterThan(0);
	});

	it("registers the Better Auth security schemes", async () => {
		const spec = await getSpec();

		expect(spec.components?.securitySchemes).toHaveProperty("betterAuthSession");
		expect(spec.components?.securitySchemes).toHaveProperty("betterAuthSecureSession");
	});

	it("gives every operation a unique operationId, a summary, tags, and security", async () => {
		const spec = await getSpec();
		const operations = getOperations(spec);
		const documentedTags = new Set((spec.tags ?? []).map((tag) => tag.name));

		expect(operations.length).toBeGreaterThan(0);

		const operationIds = operations.map(({ operation, path, method }) => {
			expect(operation.operationId, `${method.toUpperCase()} ${path} is missing an operationId`).toBeTruthy();
			expect(operation.summary, `${method.toUpperCase()} ${path} is missing a summary`).toBeTruthy();
			expect(operation.security, `${method.toUpperCase()} ${path} is missing security`).toBeTruthy();

			for (const tag of operation.tags ?? []) {
				expect(documentedTags.has(tag), `${method.toUpperCase()} ${path} uses undocumented tag "${tag}"`).toBe(
					true
				);
			}

			expect(operation.tags?.length, `${method.toUpperCase()} ${path} is missing tags`).toBeGreaterThan(0);

			return operation.operationId;
		});

		expect(new Set(operationIds).size).toBe(operationIds.length);
	});

	it("documents every 4xx and 5xx JSON response with the shared ErrorResponse schema", async () => {
		const spec = await getSpec();

		for (const { path, method, operation } of getOperations(spec)) {
			for (const [status, response] of Object.entries(operation.responses ?? {})) {
				if (Number(status) < 400) {
					continue;
				}

				const jsonSchema = response.content?.["application/json"]?.schema;

				expect(
					jsonSchema?.$ref,
					`${method.toUpperCase()} ${path} ${status} must reference the ErrorResponse schema`
				).toBe("#/components/schemas/ErrorResponse");
			}
		}
	});

	it("uses RESTful paths without verbs and keeps auth endpoints out of the spec", async () => {
		const spec = await getSpec();

		for (const path of Object.keys(spec.paths)) {
			expect(path.startsWith("/api/"), `${path} must be served under the /api base path`).toBe(true);
			expect(path.startsWith("/api/auth"), `${path} must not document Better Auth endpoints`).toBe(false);
			expect(path, `${path} must use kebab-case path segments`).toMatch(/^(\/(([a-z0-9-]+)|\{[a-zA-Z]+\}))+$/);
		}
	});

	it("returns the standard error shape for unauthenticated requests", async () => {
		const app = createTestApp();
		const response = await app.request("/api/link-previews?url=https://example.com");

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: { message: "Authentication is required." } });
	});

	it("returns the standard error shape for unknown routes", async () => {
		const app = createTestApp();
		const response = await app.request("/api/does-not-exist");

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: { message: "Not found." } });
	});
});
