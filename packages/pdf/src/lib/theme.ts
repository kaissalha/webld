/**
 * PDF theme definition mapping our UI package's design tokens (globals.css)
 * to hex values compatible with @react-pdf/renderer.
 *
 * Light-mode only — PDFs target print/export where light backgrounds are standard.
 * OKLCH → hex approximations match the :root tokens in packages/ui/src/globals.css.
 */

export type PdfxTheme = {
	colors: {
		foreground: string;
		background: string;
		border: string;
		primary: string;
		primaryForeground: string;
		accent: string;
		muted: string;
		mutedForeground: string;
		destructive: string;
		success: string;
		successForeground: string;
		warning: string;
		warningForeground: string;
		info: string;
	};
	typography: {
		body: { fontFamily: string; fontSize: number; lineHeight: number };
		heading: {
			fontFamily: string;
			fontSize: { h1: number; h2: number; h3: number; h4: number; h5: number; h6: number };
			lineHeight: number;
			fontWeight: number;
		};
	};
	spacing: {
		sectionGap: number;
		componentGap: number;
		paragraphGap: number;
		page: { marginTop: number; marginBottom: number; marginLeft: number; marginRight: number };
	};
	primitives: {
		spacing: Record<number, number>;
		borderRadius: { sm: number; md: number; full: number };
		fontWeights: { regular: number; medium: number; semibold: number; bold: number };
		typography: { xs: number; sm: number; base: number; lg: number; xl: number; "2xl": number; "3xl": number };
		lineHeights: { normal: number };
		letterSpacing: { tight: number; normal: number; wide: number; wider: number };
	};
};

export const defaultTheme: PdfxTheme = {
	colors: {
		foreground: "#0A0A0A",
		background: "#FFFFFF",
		primary: "#141414",
		primaryForeground: "#FAFAFA",
		accent: "#6F6F6F",
		muted: "#F5F5F0",
		mutedForeground: "#6F6F6F",
		border: "#E4E4E8",
		destructive: "#DC2626",
		success: "#16A34A",
		successForeground: "#166534",
		warning: "#CA8A04",
		warningForeground: "#B45309",
		info: "#2563EB",
	},
	typography: {
		body: { fontFamily: "Geist", fontSize: 10, lineHeight: 1.6 },
		heading: {
			fontFamily: "Geist",
			fontSize: { h1: 22, h2: 18, h3: 14, h4: 12, h5: 10, h6: 9 },
			lineHeight: 1.25,
			fontWeight: 600,
		},
	},
	spacing: {
		sectionGap: 24,
		componentGap: 14,
		paragraphGap: 8,
		page: { marginTop: 40, marginBottom: 40, marginLeft: 40, marginRight: 40 },
	},
	primitives: {
		spacing: { 0: 0, 0.5: 2, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48 },
		borderRadius: { sm: 2, md: 4, full: 9999 },
		fontWeights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
		typography: { xs: 8, sm: 9, base: 10, lg: 12, xl: 14, "2xl": 18, "3xl": 22 },
		lineHeights: { normal: 1.6 },
		letterSpacing: { tight: -0.02, normal: 0, wide: 0.02, wider: 0.04 },
	},
};
