import type { Style } from "@react-pdf/types";

export type ListVariant = "bullet" | "numbered" | "checklist" | "icon" | "multi-level" | "descriptive";

export type ListItem = {
	text: string;
	description?: string;
	checked?: boolean;
	children?: ListItem[];
};

export type PdfListProps = {
	items: ListItem[];
	variant?: ListVariant;
	gap?: "xs" | "sm" | "md";
	style?: Style;
	_level?: number;
	noWrap?: boolean;
};
