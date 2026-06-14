import { describe, expect, it } from "vitest";

import { streamToAsyncIterable } from "../../src/ai/types";

describe("streamToAsyncIterable", () => {
	it("yields stream values in order", async () => {
		const stream = new ReadableStream<string>({
			start(controller) {
				controller.enqueue("one");
				controller.enqueue("two");
				controller.close();
			},
		});

		const values: string[] = [];
		for await (const value of streamToAsyncIterable(stream)) {
			values.push(value);
		}

		expect(values).toEqual(["one", "two"]);
	});

	it("supports early cancellation", async () => {
		const stream = new ReadableStream<string>({
			start(controller) {
				controller.enqueue("first");
				controller.enqueue("second");
				controller.close();
			},
		});

		const values: string[] = [];
		for await (const value of streamToAsyncIterable(stream)) {
			values.push(value);
			break;
		}

		expect(values).toEqual(["first"]);
	});
});
