import { Text as PDFText, Rect, StyleSheet, Svg, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import QRCode from "qrcode";

import { usePdfxTheme, useSafeMemo } from "../../lib/theme-context";

type PdfxTheme = ReturnType<typeof usePdfxTheme>;

export type QRCodeErrorLevel = "L" | "M" | "Q" | "H";

export type PdfQRCodeProps = {
	style?: Style;
	value: string;
	size?: number;
	color?: string;
	backgroundColor?: string;
	errorLevel?: QRCodeErrorLevel;
	margin?: number;
	caption?: string;
	children?: never;
};

const THEME_COLOR_KEYS = [
	"foreground",
	"muted",
	"mutedForeground",
	"primary",
	"primaryForeground",
	"accent",
	"destructive",
	"success",
	"warning",
	"info",
] as const;

const resolveColor = (value: string, colors: Record<string, string>): string =>
	THEME_COLOR_KEYS.includes(value as (typeof THEME_COLOR_KEYS)[number]) ? colors[value] : value;

const createQRCodeStyles = (t: PdfxTheme) => {
	const { spacing } = t.primitives;
	return StyleSheet.create({
		container: { alignItems: "center" },
		caption: {
			fontFamily: t.typography.body.fontFamily,
			fontSize: t.primitives.typography.xs,
			color: t.colors.mutedForeground,
			marginTop: spacing[1],
			textAlign: "center",
		},
	});
};

const generateQRMatrix = (value: string, errorLevel: QRCodeErrorLevel, margin: number): boolean[][] => {
	const qr = QRCode.create(value, { errorCorrectionLevel: errorLevel });
	const { size, data } = qr.modules;
	const totalSize = size + margin * 2;
	const matrix: boolean[][] = [];
	for (let row = 0; row < totalSize; row++) {
		const rowData: boolean[] = [];
		for (let col = 0; col < totalSize; col++) {
			const isInMargin = row < margin || row >= size + margin || col < margin || col >= size + margin;
			rowData.push(isInMargin ? false : data[(row - margin) * size + (col - margin)] === 1);
		}
		matrix.push(rowData);
	}
	return matrix;
};

export const PdfQRCode = ({
	value,
	size = 100,
	color = "#000000",
	backgroundColor = "#ffffff",
	errorLevel = "M",
	margin = 2,
	caption,
	style,
}: PdfQRCodeProps) => {
	const theme = usePdfxTheme();
	const styles = useSafeMemo(() => createQRCodeStyles(theme), [theme]);
	const matrix = useSafeMemo(() => generateQRMatrix(value, errorLevel, margin), [value, errorLevel, margin]);
	const moduleSize = size / matrix.length;
	const resolvedColor = resolveColor(color, theme.colors);
	const resolvedBgColor = backgroundColor === "transparent" ? undefined : resolveColor(backgroundColor, theme.colors);
	const containerStyles: Style[] = [styles.container];
	if (style) containerStyles.push(...[style].flat());

	return (
		<View style={containerStyles}>
			<Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
				{resolvedBgColor !== undefined && (
					<Rect x={0} y={0} width={size} height={size} fill={resolvedBgColor} />
				)}
				{matrix
					.flatMap((row, y) =>
						row
							.map((isDark, x) => (isDark ? { x, y } : null))
							.filter((pos): pos is { x: number; y: number } => pos !== null)
					)
					.map((pos) => (
						<Rect
							key={`qr-${pos.y}-${pos.x}`}
							x={pos.x * moduleSize}
							y={pos.y * moduleSize}
							width={moduleSize}
							height={moduleSize}
							fill={resolvedColor}
						/>
					))}
			</Svg>
			{caption && <PDFText style={styles.caption}>{caption}</PDFText>}
		</View>
	);
};
