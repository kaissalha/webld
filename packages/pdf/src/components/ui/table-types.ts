import type React from "react";

import type { Style } from "@react-pdf/types";

export type TableVariant = "line" | "grid" | "minimal" | "striped" | "compact" | "bordered" | "primary-header";

export type TableProps = {
	style?: Style;
	children: React.ReactNode;
	variant?: TableVariant;
	zebraStripe?: boolean;
	noWrap?: boolean;
};

export type TableSectionProps = {
	style?: Style;
	children: React.ReactNode;
};

export type TableRowProps = {
	style?: Style;
	children: React.ReactNode;
	header?: boolean;
	footer?: boolean;
	stripe?: boolean;
	variant?: TableVariant;
};

export type TableCellProps = {
	style?: Style;
	children: React.ReactNode;
	header?: boolean;
	footer?: boolean;
	align?: "left" | "center" | "right";
	width?: string | number;
	variant?: TableVariant;
	_last?: boolean;
};
