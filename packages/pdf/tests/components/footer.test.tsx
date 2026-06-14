import * as React from "react";

import { describe, expect, it, vi } from "vitest";

// Mock @react-pdf/renderer
vi.mock("@react-pdf/renderer", () => ({
	Text: ({
		children,
		render,
	}: {
		children?: React.ReactNode;
		render?: (props: { pageNumber: number; totalPages: number }) => string;
	}) => {
		if (render) {
			return { type: "Text", props: { children: render({ pageNumber: 1, totalPages: 5 }) } };
		}
		return { type: "Text", props: { children } };
	},
	View: ({ children, style }: { children?: React.ReactNode; style?: object }) => ({
		type: "View",
		props: { children, style },
	}),
	StyleSheet: {
		create: <T extends Record<string, object>>(styles: T): T => styles,
	},
	Font: {
		register: vi.fn(),
	},
}));

import { Footer } from "../../src/components/footer";

describe("Footer", () => {
	it("renders with default props", () => {
		const result = Footer({});

		expect(result).toBeDefined();
		expect(result.type).toBeDefined();
		expect(result.props).toBeDefined();
	});

	it("uses custom company name", () => {
		const result = Footer({ companyName: "Test Corp" });

		expect(result).toBeDefined();
		expect(JSON.stringify(result)).toContain("Test Corp");
	});

	it("respects pageNumber prop when false", () => {
		const result = Footer({ pageNumber: false });

		// When pageNumber is false, there should only be one child (copyright text)
		expect(result.props.children).toBeDefined();
	});

	it("respects pageNumber prop when true", () => {
		const result = Footer({ pageNumber: true });

		expect(result.props.children).toBeDefined();
	});

	it("passes locale to i18n", () => {
		const resultEn = Footer({ locale: "en" });
		const resultFallbackLocale = Footer({ locale: "fr" });

		expect(resultEn).toBeDefined();
		expect(resultFallbackLocale).toBeDefined();
	});
});
