import { Font, StyleSheet } from "@react-pdf/renderer";

const registerFonts = () => {
	const geistLatin400 =
		"https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.1/files/geist-sans-latin-400-normal.woff";

	Font.register({
		family: "Geist",
		fonts: [
			{
				src: geistLatin400,
				fontWeight: 400,
				fontStyle: "normal",
			},
			// Synthetic italic: Geist has no italic webfont in @react-pdf; map to upright to avoid resolution errors
			{
				src: geistLatin400,
				fontWeight: 400,
				fontStyle: "italic",
			},
			{
				src: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.1/files/geist-sans-latin-500-normal.woff",
				fontWeight: 500,
				fontStyle: "normal",
			},
			{
				src: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.1/files/geist-sans-latin-600-normal.woff",
				fontWeight: 600,
				fontStyle: "normal",
			},
			{
				src: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.1/files/geist-sans-latin-700-normal.woff",
				fontWeight: 700,
				fontStyle: "normal",
			},
		],
	});

	Font.register({
		family: "Playfair Display",
		fonts: [
			{
				src: "https://cdn.jsdelivr.net/npm/@fontsource/playfair-display@5.0.8/files/playfair-display-latin-400-normal.woff",
				fontWeight: 400,
				fontStyle: "normal",
			},
			{
				src: "https://cdn.jsdelivr.net/npm/@fontsource/playfair-display@5.0.8/files/playfair-display-latin-500-normal.woff",
				fontWeight: 500,
				fontStyle: "normal",
			},
			{
				src: "https://cdn.jsdelivr.net/npm/@fontsource/playfair-display@5.0.8/files/playfair-display-latin-600-normal.woff",
				fontWeight: 600,
				fontStyle: "normal",
			},
			{
				src: "https://cdn.jsdelivr.net/npm/@fontsource/playfair-display@5.0.8/files/playfair-display-latin-700-normal.woff",
				fontWeight: 700,
				fontStyle: "normal",
			},
		],
	});
};

registerFonts();

export const baseStyles = StyleSheet.create({
	page: {
		fontFamily: "Geist",
		fontSize: 10,
		padding: 40,
		backgroundColor: "#FFFFFF",
		color: "#121212",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 30,
	},
	title: {
		fontSize: 24,
		fontWeight: 700,
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 14,
		fontWeight: 500,
		color: "#707070",
	},
	text: {
		fontSize: 10,
		lineHeight: 1.5,
	},
	textMuted: {
		fontSize: 10,
		color: "#707070",
	},
	textBold: {
		fontWeight: 600,
	},
	section: {
		marginBottom: 20,
	},
	row: {
		flexDirection: "row",
	},
	column: {
		flexDirection: "column",
	},
	divider: {
		borderBottomWidth: 1,
		borderBottomColor: "#E8E7E1",
		marginVertical: 15,
	},
	footer: {
		position: "absolute",
		bottom: 20,
		left: 40,
		right: 40,
		textAlign: "center",
		fontSize: 9,
		color: "#707070",
	},
});
