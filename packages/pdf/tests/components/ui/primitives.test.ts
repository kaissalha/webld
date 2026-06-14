import { describe, expect, it, vi } from "vitest";

vi.mock("@react-pdf/renderer", () => ({
	Text: ({ children, style, wrap }: { children?: unknown; style?: unknown; wrap?: boolean }) => ({
		type: "Text",
		props: { children, style, wrap },
	}),
	View: ({
		children,
		style,
		wrap,
		minPresenceAhead,
	}: {
		children?: unknown;
		style?: unknown;
		wrap?: boolean;
		minPresenceAhead?: number;
	}) => ({
		type: "View",
		props: { children, style, wrap, minPresenceAhead },
	}),
	StyleSheet: {
		create: <T extends Record<string, object>>(styles: T): T => styles,
	},
	Font: {
		register: vi.fn(),
	},
}));

import { Badge } from "../../../src/components/ui/badge";
import { KeepTogether } from "../../../src/components/ui/keep-together";
import { KeyValue } from "../../../src/components/ui/key-value";
import { Stack } from "../../../src/components/ui/stack";
import { defaultTheme } from "../../../src/lib/theme";
import { usePdfxTheme, useSafeMemo } from "../../../src/lib/theme-context";

describe("pdf ui primitives", () => {
	it("returns the default theme and evaluates safe memo factories", () => {
		let factoryRuns = 0;

		expect(usePdfxTheme()).toEqual(defaultTheme);
		expect(
			useSafeMemo(() => {
				factoryRuns += 1;
				return { ok: true };
			}, ["ignored"])
		).toEqual({ ok: true });
		expect(factoryRuns).toBe(1);
	});

	it("renders KeepTogether with wrap disabled", () => {
		const result = KeepTogether({
			children: "Block",
			minPresenceAhead: 24,
			style: { marginTop: 8 },
		});

		expect(result.props.wrap).toBe(false);
		expect(result.props.minPresenceAhead).toBe(24);
		expect(result.props.style).toEqual({ marginTop: 8 });
		expect(result.props.children).toBe("Block");
	});

	it("renders Stack with directional, alignment, justify, wrap, and custom styles", () => {
		const result = Stack({
			children: "Row",
			direction: "horizontal",
			gap: "xl",
			align: "center",
			justify: "between",
			wrap: true,
			noWrap: true,
			style: { marginTop: 12, paddingBottom: 4 },
		});

		expect(result.props.wrap).toBe(false);
		expect(result.props.style).toEqual([
			{ flexDirection: "row" },
			{ gap: defaultTheme.primitives.spacing[8] },
			{ alignItems: "center" },
			{ justifyContent: "space-between" },
			{ flexWrap: "wrap" },
			{ marginTop: 12, paddingBottom: 4 },
		]);
	});

	it("renders Badge with resolved theme colors and custom overrides", () => {
		const result = Badge({
			label: "Preferred label",
			children: "Fallback child",
			variant: "outline",
			size: "lg",
			background: "primary",
			color: "warning",
			style: { marginRight: 6 },
		});
		const text = result.props.children;

		expect(result.props.style).toEqual([
			expect.objectContaining({
				borderRadius: defaultTheme.primitives.borderRadius.full,
				alignSelf: "flex-start",
			}),
			{
				borderWidth: 1,
				borderStyle: "solid",
				borderColor: defaultTheme.colors.border,
				backgroundColor: defaultTheme.colors.background,
			},
			{
				paddingHorizontal: defaultTheme.primitives.spacing[3],
				paddingVertical: defaultTheme.primitives.spacing[1],
			},
			{ backgroundColor: defaultTheme.colors.primary },
			{ marginRight: 6 },
		]);
		expect(text.props.children).toBe("Preferred label");
		expect(text.props.wrap).toBe(false);
		expect(text.props.style).toEqual([
			{
				fontFamily: "Geist",
				fontWeight: defaultTheme.primitives.fontWeights.semibold,
				letterSpacing: 0,
				color: defaultTheme.colors.mutedForeground,
			},
			{ fontSize: 14, lineHeight: 1.2 },
			{ color: defaultTheme.colors.warning },
		]);
	});

	it("renders KeyValue rows horizontally with dividers and bold values", () => {
		const result = KeyValue({
			items: [
				{
					key: "Status",
					value: "Ready",
					keyStyle: { textTransform: "uppercase" },
					valueStyle: { letterSpacing: 0.4 },
				},
				{
					key: "Owner",
					value: "Dr. Rivera",
				},
			],
			direction: "horizontal",
			divided: true,
			size: "lg",
			labelFlex: 2,
			labelColor: "mutedForeground",
			valueColor: "success",
			boldValue: true,
			noWrap: true,
			dividerColor: "warning",
			dividerThickness: 3,
			dividerMargin: 9,
			style: { marginTop: 4 },
		});
		const [firstRow, secondRow] = result.props.children;
		const [firstKey, firstValue] = firstRow.props.children;
		const [secondKey, secondValue] = secondRow.props.children;

		expect(result.props.wrap).toBe(false);
		expect(result.props.style).toEqual([{ flexDirection: "column" }, { marginTop: 4 }]);
		expect(firstRow.props.style).toEqual([
			{ flexDirection: "row", alignItems: "flex-start", paddingVertical: defaultTheme.primitives.spacing[1] },
			{
				borderBottomWidth: 3,
				borderBottomColor: defaultTheme.colors.warning,
				borderBottomStyle: "solid",
				marginBottom: 9,
			},
		]);
		expect(firstKey.props.style).toEqual([
			{
				fontFamily: defaultTheme.typography.body.fontFamily,
				color: defaultTheme.colors.mutedForeground,
				fontWeight: defaultTheme.primitives.fontWeights.medium,
				fontSize: defaultTheme.primitives.typography.base,
			},
			{ color: defaultTheme.colors.mutedForeground },
			{ textTransform: "uppercase" },
			{ flex: 2 },
		]);
		expect(firstValue.props.style).toEqual([
			{
				fontFamily: defaultTheme.typography.body.fontFamily,
				color: defaultTheme.colors.foreground,
				fontWeight: defaultTheme.primitives.fontWeights.regular,
				fontSize: defaultTheme.primitives.typography.base,
			},
			{ fontWeight: defaultTheme.primitives.fontWeights.bold },
			{ color: defaultTheme.colors.success },
			{ letterSpacing: 0.4 },
			{ flex: 1, textAlign: "right" },
		]);
		expect(secondKey.props.style.at(-1)).toEqual({ flex: 2 });
		expect(secondValue.props.style.at(-1)).toEqual({ flex: 1, textAlign: "right" });
	});

	it("renders KeyValue rows vertically and lets item colors override the shared value color", () => {
		const result = KeyValue({
			items: [
				{
					key: "Priority",
					value: "Critical",
					valueColor: "destructive",
				},
				{
					key: "Window",
					value: "2 weeks",
				},
			],
			direction: "vertical",
			divided: true,
			valueColor: "info",
		});
		const [firstRow, secondRow] = result.props.children;
		const [firstKey, firstValue] = firstRow.props.children;
		const [, secondValue] = secondRow.props.children;

		expect(firstRow.props.style).toEqual([
			{ flexDirection: "column", marginBottom: defaultTheme.spacing.paragraphGap },
			{
				borderBottomWidth: defaultTheme.primitives.spacing[0.5],
				borderBottomColor: defaultTheme.colors.border,
				borderBottomStyle: "solid",
			},
		]);
		expect(firstKey.props.children).toBe("Priority");
		expect(firstValue.props.style).toEqual([
			{
				fontFamily: defaultTheme.typography.body.fontFamily,
				color: defaultTheme.colors.foreground,
				fontWeight: defaultTheme.primitives.fontWeights.regular,
				fontSize: defaultTheme.typography.body.fontSize,
			},
			{ color: defaultTheme.colors.destructive },
		]);
		expect(secondValue.props.style).toEqual([
			{
				fontFamily: defaultTheme.typography.body.fontFamily,
				color: defaultTheme.colors.foreground,
				fontWeight: defaultTheme.primitives.fontWeights.regular,
				fontSize: defaultTheme.typography.body.fontSize,
			},
			{ color: defaultTheme.colors.info },
		]);
	});
});
