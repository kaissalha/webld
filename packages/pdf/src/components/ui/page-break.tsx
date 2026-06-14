import { View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";

export type PageBreakProps = {
	style?: Style;
	children?: never;
};

export const PageBreak = ({ style }: PageBreakProps) => <View break style={style} />;
