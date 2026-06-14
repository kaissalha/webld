import * as React from "react";

import { render } from "react-email";
import { describe, expect, it } from "vitest";

import WelcomeEmail from "../../src/emails/welcome";

describe("WelcomeEmail", () => {
	it("renders the greeting and support text", async () => {
		const html = await render(<WelcomeEmail fullName='Ada Lovelace' />);

		expect(html).toContain("Ada");
		expect(html).toContain("Welcome to Starter");
	});

	it("renders default name when fullName is missing", async () => {
		const html = await render(<WelcomeEmail />);

		expect(html).toContain("Viktor");
	});

	it("handles missing first name gracefully", async () => {
		const html = await render(<WelcomeEmail fullName='' />);

		expect(html).toContain("Welcome to Starter");
	});
});
