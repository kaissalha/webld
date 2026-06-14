import { Text as PDFText, StyleSheet, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";

import { usePdfxTheme, useSafeMemo } from "../../lib/theme-context";

type PdfxTheme = ReturnType<typeof usePdfxTheme>;

export type BadgeVariant =
	| "default"
	| "secondary"
	| "primary"
	| "success"
	| "warning"
	| "destructive"
	| "info"
	| "outline"
	| "optimal"
	| "suboptimal"
	| "critical";
export type BadgeSize = "sm" | "md" | "lg";

export type BadgeProps = {
	style?: Style;
	label?: string;
	children?: string;
	variant?: BadgeVariant;
	size?: BadgeSize;
	background?: string;
	color?: string;
};

const THEME_COLOR_KEYS = [
	"foreground",
	"background",
	"muted",
	"mutedForeground",
	"primary",
	"primaryForeground",
	"accent",
	"border",
	"destructive",
	"success",
	"successForeground",
	"warning",
	"warningForeground",
	"info",
] as const;

const resolveColor = (value: string, colors: Record<string, string>): string =>
	THEME_COLOR_KEYS.includes(value as (typeof THEME_COLOR_KEYS)[number]) ? colors[value] : value;

/**
 * Tailwind-style /10 /20 tints on white — solid hex avoids inconsistent rgba handling
 * across PDF viewers and react-pdf versions.
 */
const tintOnWhite = (hex: string, strength: number): string => {
	const raw = hex.replace("#", "");
	const r = Number.parseInt(raw.slice(0, 2), 16);
	const g = Number.parseInt(raw.slice(2, 4), 16);
	const b = Number.parseInt(raw.slice(4, 6), 16);
	const mix = (channel: number) => Math.round(channel * strength + 255 * (1 - strength));
	return `#${mix(r).toString(16).padStart(2, "0")}${mix(g).toString(16).padStart(2, "0")}${mix(b).toString(16).padStart(2, "0")}`;
};

const createBadgeStyles = (t: PdfxTheme) => {
	const { spacing, borderRadius, fontWeights } = t.primitives;
	const c = t.colors;
	const textBase = {
		fontFamily: t.typography.body.fontFamily,
		fontWeight: fontWeights.semibold,
		letterSpacing: 0,
	};
	const transparentBorder = {
		borderWidth: 0,
		borderStyle: "solid" as const,
		borderColor: "transparent",
	};
	const sheet = StyleSheet.create({
		containerBase: {
			borderRadius: borderRadius.full,
			alignSelf: "flex-start" as const,
			flexDirection: "row" as const,
			alignItems: "center" as const,
			flexShrink: 0,
		},
		variantDefault: {
			...transparentBorder,
			backgroundColor: c.muted,
		},
		variantSecondary: {
			...transparentBorder,
			backgroundColor: c.muted,
		},
		variantPrimary: {
			...transparentBorder,
			backgroundColor: c.muted,
		},
		variantSuccess: {
			...transparentBorder,
			backgroundColor: tintOnWhite(c.success, 0.2),
		},
		variantWarning: {
			...transparentBorder,
			backgroundColor: tintOnWhite(c.warning, 0.2),
		},
		variantDestructive: {
			...transparentBorder,
			backgroundColor: tintOnWhite(c.destructive, 0.1),
		},
		variantInfo: {
			...transparentBorder,
			backgroundColor: tintOnWhite(c.info, 0.2),
		},
		variantOutline: {
			borderWidth: 1,
			borderStyle: "solid" as const,
			borderColor: c.border,
			backgroundColor: c.background,
		},
		variantOptimal: {
			...transparentBorder,
			backgroundColor: tintOnWhite(c.success, 0.2),
		},
		variantSuboptimal: {
			...transparentBorder,
			backgroundColor: tintOnWhite(c.warning, 0.2),
		},
		variantCritical: {
			...transparentBorder,
			backgroundColor: tintOnWhite(c.destructive, 0.1),
		},
		sizeSm: { paddingHorizontal: 6, paddingVertical: 1 },
		sizeMd: { paddingHorizontal: spacing[2], paddingVertical: 1 },
		sizeLg: { paddingHorizontal: spacing[3], paddingVertical: spacing[1] },
		textDefault: { ...textBase, color: c.mutedForeground },
		textSecondary: { ...textBase, color: c.primary },
		textPrimary: { ...textBase, color: c.primary },
		textSuccess: { ...textBase, color: c.mutedForeground },
		textWarning: { ...textBase, color: c.mutedForeground },
		textDestructive: { ...textBase, color: c.mutedForeground },
		textInfo: { ...textBase, color: c.mutedForeground },
		textOutline: { ...textBase, color: c.mutedForeground },
		textOptimal: { ...textBase, color: c.successForeground },
		textSuboptimal: { ...textBase, color: c.warningForeground },
		textCritical: { ...textBase, color: c.destructive },
		textSm: { fontSize: 10, lineHeight: 1.2 },
		textMd: { fontSize: 12, lineHeight: 1.2 },
		textLg: { fontSize: 14, lineHeight: 1.2 },
	});
	return {
		...sheet,
		containerVariantMap: {
			default: sheet.variantDefault,
			secondary: sheet.variantSecondary,
			primary: sheet.variantPrimary,
			success: sheet.variantSuccess,
			warning: sheet.variantWarning,
			destructive: sheet.variantDestructive,
			info: sheet.variantInfo,
			outline: sheet.variantOutline,
			optimal: sheet.variantOptimal,
			suboptimal: sheet.variantSuboptimal,
			critical: sheet.variantCritical,
		} as Record<BadgeVariant, Style>,
		textVariantMap: {
			default: sheet.textDefault,
			secondary: sheet.textSecondary,
			primary: sheet.textPrimary,
			success: sheet.textSuccess,
			warning: sheet.textWarning,
			destructive: sheet.textDestructive,
			info: sheet.textInfo,
			outline: sheet.textOutline,
			optimal: sheet.textOptimal,
			suboptimal: sheet.textSuboptimal,
			critical: sheet.textCritical,
		} as Record<BadgeVariant, Style>,
		containerSizeMap: { sm: sheet.sizeSm, md: sheet.sizeMd, lg: sheet.sizeLg } as Record<BadgeSize, Style>,
		textSizeMap: { sm: sheet.textSm, md: sheet.textMd, lg: sheet.textLg } as Record<BadgeSize, Style>,
	};
};

export const Badge = ({ label, children, variant = "default", size = "md", background, color, style }: BadgeProps) => {
	const theme = usePdfxTheme();
	const styles = useSafeMemo(() => createBadgeStyles(theme), [theme]);
	const text = label ?? children ?? "";
	const containerStyles: Style[] = [
		styles.containerBase,
		styles.containerVariantMap[variant],
		styles.containerSizeMap[size],
		...(background ? [{ backgroundColor: resolveColor(background, theme.colors) }] : []),
		...(style ? [style].flat() : []),
	];
	const textStyles: Style[] = [
		styles.textVariantMap[variant],
		styles.textSizeMap[size],
		...(color ? [{ color: resolveColor(color, theme.colors) }] : []),
	];
	return (
		<View style={containerStyles}>
			<PDFText style={textStyles} wrap={false}>
				{text}
			</PDFText>
		</View>
	);
};
