import { headers } from "next/headers";
import Image from "next/image";

import { getTranslations } from "next-intl/server";

import { getCurrentWeather } from "./get-current-weather";

type HomePageWeatherProps = {
	variant: "desktopGreeting" | "mobileHeader";
};

const weatherVariantClasses = {
	desktopGreeting: {
		container: "flex shrink-0 items-center gap-2",
		icon: "size-14 shrink-0",
		iconSize: 56,
		temperature: "text-3xl leading-none font-medium tabular-nums tracking-tight",
	},
	mobileHeader: {
		container: "flex shrink-0 items-center gap-1.5",
		icon: "size-8 shrink-0",
		iconSize: 32,
		temperature: "text-lg leading-none font-medium tabular-nums tracking-tight",
	},
} as const;

export const HomePageWeather = async ({ variant }: HomePageWeatherProps) => {
	const [requestHeaders, tHome] = await Promise.all([headers(), getTranslations("dashboard.home")]);
	const weather = await getCurrentWeather({ requestHeaders });

	if (!weather) {
		return null;
	}

	const classes = weatherVariantClasses[variant];
	const temperatureLabel = `${weather.temperature}°${weather.temperatureUnit}`;
	const temperatureUnitLabel =
		weather.temperatureUnit === "F" ? tHome("weather.units.fahrenheit") : tHome("weather.units.celsius");

	return (
		<div
			role='img'
			aria-label={tHome("weather.summaryAriaLabel", {
				description: weather.description,
				temperature: weather.temperature,
				unit: temperatureUnitLabel,
			})}
			className={classes.container}
		>
			<Image
				src={weather.iconUrl}
				alt=''
				width={classes.iconSize}
				height={classes.iconSize}
				unoptimized
				aria-hidden='true'
				className={classes.icon}
			/>
			<span aria-hidden='true' className={classes.temperature}>
				{temperatureLabel}
			</span>
		</div>
	);
};
