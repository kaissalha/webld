import type React from "react";

import type { Style } from "@react-pdf/types";

import type { TableVariant } from "./table-types";

export type DataTableSize = "default" | "compact";

export type DataTableColumn<T = Record<string, unknown>> = {
	key: keyof T & string;
	header: string;
	align?: "left" | "center" | "right";
	width?: string | number;
	render?: (value: unknown, row: T) => React.ReactNode;
	renderFooter?: (value: unknown) => React.ReactNode;
};

export type DataTableProps<T = Record<string, unknown>> = {
	style?: Style;
	columns: DataTableColumn<T>[];
	data: T[];
	variant?: TableVariant;
	footer?: Partial<Record<keyof T & string, string | number>>;
	stripe?: boolean;
	size?: DataTableSize;
	noWrap?: boolean;
};
