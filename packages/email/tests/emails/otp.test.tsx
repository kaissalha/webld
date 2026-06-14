import * as React from "react";

import { render } from "react-email";
import { describe, expect, it } from "vitest";

import OtpEmail from "../../src/emails/otp";

describe("OtpEmail", () => {
	it("renders the OTP code and translations", async () => {
		const html = await render(<OtpEmail otp='654321' />);

		expect(html).toContain("654321");
		expect(html).toContain("Your verification code");
	});

	it("renders default OTP when none is provided", async () => {
		const html = await render(<OtpEmail />);

		expect(html).toContain("123456");
	});

	it("falls back to English for unsupported locale", async () => {
		const html = await render(<OtpEmail otp='000000' locale='fr' />);

		expect(html).toContain("Your verification code");
	});
});
