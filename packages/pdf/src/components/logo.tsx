import * as React from "react";

import { Path, Svg, View } from "@react-pdf/renderer";

type LogoProps = {
	size?: number;
	color?: string;
};

export const Logo = ({ size = 40, color = "#000000" }: LogoProps) => {
	return (
		<View>
			<Svg viewBox='0 0 100 130' style={{ width: size, height: size * 1.3 }}>
				<Path d='M50,50 L65,65 L50,80 L35,65 Z' fill={color} />
				<Path d='M50,17 L50,56' stroke={color} strokeWidth={5} />
				<Path d='M2,65 L38,65' stroke={color} strokeWidth={5} />
				<Path d='M62,65 L98,65' stroke={color} strokeWidth={5} />
				<Path d='M36,48 L20,32' stroke={color} strokeWidth={5} />
				<Path d='M64,48 L80,32' stroke={color} strokeWidth={5} />
				<Path d='M50,76 L50,113' stroke={color} strokeWidth={5} />
				<Path d='M36,82 L20,98' stroke={color} strokeWidth={5} />
				<Path d='M64,82 L80,98' stroke={color} strokeWidth={5} />
			</Svg>
		</View>
	);
};
