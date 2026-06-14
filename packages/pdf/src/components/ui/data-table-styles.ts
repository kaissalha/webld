import { StyleSheet } from "@react-pdf/renderer";

import type { usePdfxTheme } from "../../lib/theme-context";

type PdfxTheme = ReturnType<typeof usePdfxTheme>;

export const createCompactStyles = (t: PdfxTheme) => {
	const { spacing, fontWeights, lineHeights } = t.primitives;
	return StyleSheet.create({
		cell: { paddingVertical: spacing[0.5], paddingHorizontal: spacing[2] },
		text: {
			fontFamily: t.typography.body.fontFamily,
			fontSize: t.primitives.typography.xs,
			lineHeight: lineHeights.normal,
			color: t.colors.foreground,
		},
		headerText: {
			fontFamily: t.typography.body.fontFamily,
			fontSize: t.primitives.typography.xs,
			lineHeight: lineHeights.normal,
			color: t.colors.foreground,
			fontWeight: fontWeights.semibold,
		},
		footerText: {
			fontFamily: t.typography.body.fontFamily,
			fontSize: t.primitives.typography.xs,
			lineHeight: lineHeights.normal,
			color: t.colors.foreground,
			fontWeight: fontWeights.semibold,
		},
	});
};

export const formatValue = (value: unknown): string => {
	if (value === null || value === undefined) return "";
	if (typeof value === "number") return String(value);
	return String(value);
};
