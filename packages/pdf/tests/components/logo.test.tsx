import * as React from "react";

import { describe, expect, it, vi } from "vitest";

// Mock @react-pdf/renderer
vi.mock("@react-pdf/renderer", () => ({
	Svg: ({ viewBox, style, children }: { viewBox: string; style: object; children: React.ReactNode }) => ({
		type: "Svg",
		props: { viewBox, style, children },
	}),
	Path: ({ d, fill, stroke, strokeWidth }: { d: string; fill?: string; stroke?: string; strokeWidth?: number }) => ({
		type: "Path",
		props: { d, fill, stroke, strokeWidth },
	}),
	View: ({ children }: { children: React.ReactNode }) => ({
		type: "View",
		props: { children },
	}),
}));

import { Logo } from "../../src/components/logo";

describe("Logo", () => {
	it("renders with default props", () => {
		const result = Logo({});

		expect(result).toBeDefined();
		expect(result.type).toBeDefined();
		expect(result.props).toBeDefined();
	});

	it("applies default size of 40", () => {
		const result = Logo({});
		const svg = result.props.children;

		expect(svg.props.style.width).toBe(40);
		expect(svg.props.style.height).toBe(40 * 1.3);
	});

	it("applies custom size", () => {
		const result = Logo({ size: 60 });
		const svg = result.props.children;

		expect(svg.props.style.width).toBe(60);
		expect(svg.props.style.height).toBe(60 * 1.3);
	});

	it("applies default color #000000", () => {
		const result = Logo({});
		const svg = result.props.children;
		const paths = svg.props.children;

		// First path should have fill color
		expect(paths[0].props.fill).toBe("#000000");
	});

	it("applies custom color", () => {
		const result = Logo({ color: "#FF0000" });
		const svg = result.props.children;
		const paths = svg.props.children;

		expect(paths[0].props.fill).toBe("#FF0000");
		expect(paths[1].props.stroke).toBe("#FF0000");
	});

	it("renders correct viewBox", () => {
		const result = Logo({});
		const svg = result.props.children;

		expect(svg.props.viewBox).toBe("0 0 100 130");
	});

	it("renders all 9 paths", () => {
		const result = Logo({});
		const svg = result.props.children;
		const paths = svg.props.children;

		expect(paths).toHaveLength(9);
	});
});
