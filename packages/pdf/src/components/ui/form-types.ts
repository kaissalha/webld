import type { Style } from "@react-pdf/types";

export type PdfFormVariant = "underline" | "box" | "outlined" | "ghost";
export type FormLayout = "single" | "two-column" | "three-column";
export type FormLabelPosition = "above" | "left";

export type PdfFormField = {
	label: string;
	hint?: string;
	height?: number;
	width?: number | string;
};

export type PdfFormGroup = {
	title?: string;
	fields: PdfFormField[];
	layout?: FormLayout;
};

export type PdfFormProps = {
	title?: string;
	subtitle?: string;
	groups: PdfFormGroup[];
	variant?: PdfFormVariant;
	labelPosition?: FormLabelPosition;
	noWrap?: boolean;
	style?: Style;
};
