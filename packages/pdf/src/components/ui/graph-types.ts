import type { Style } from "@react-pdf/types";

export type GraphWidthOptions = { containerPadding?: number; wrapperPadding?: number; pageWidth?: number };
export type GraphVariant = "bar" | "horizontal-bar" | "line" | "area" | "pie" | "donut";
export type GraphLegendPosition = "bottom" | "right" | "none";

export type GraphDataPoint = { label: string; value: number; color?: string };
export type GraphSeries = { name: string; data: GraphDataPoint[]; color?: string };

export type GraphProps = {
	variant?: GraphVariant;
	data: GraphDataPoint[] | GraphSeries[];
	title?: string;
	subtitle?: string;
	xLabel?: string;
	yLabel?: string;
	width?: number;
	height?: number;
	fullWidth?: boolean;
	containerPadding?: number;
	wrapperPadding?: number;
	colors?: string[];
	showValues?: boolean;
	showGrid?: boolean;
	legend?: GraphLegendPosition;
	centerLabel?: string;
	showDots?: boolean;
	smooth?: boolean;
	yTicks?: number;
	noWrap?: boolean;
	style?: Style;
};

export type ChartLayout = {
	svgW: number;
	svgH: number;
	chartX: number;
	chartY: number;
	chartW: number;
	chartH: number;
	yMin: number;
	yMax: number;
	yTicks: number[];
	xLabels: string[];
};
