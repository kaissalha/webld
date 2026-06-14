"use client";

import { useEffect, useEffectEvent, useState } from "react";

import { useTranslations } from "next-intl";

type HomePageGreetingProps = {
	firstName?: string;
};

const getTimeGreeting = ({ t }: { t: ReturnType<typeof useTranslations<"dashboard.home.greeting">> }) => {
	const hour = new Date().getHours();

	if (hour >= 5 && hour < 12) {
		return t("morning");
	}

	if (hour >= 12 && hour < 17) {
		return t("afternoon");
	}

	return t("evening");
};

export const HomePageGreeting = ({ firstName }: HomePageGreetingProps) => {
	const tGreeting = useTranslations("dashboard.home.greeting");
	const [greeting, setGreeting] = useState(() => getTimeGreeting({ t: tGreeting }));
	const updateGreeting = useEffectEvent(() => {
		setGreeting(getTimeGreeting({ t: tGreeting }));
	});

	useEffect(() => {
		const interval = window.setInterval(() => {
			updateGreeting();
		}, 60 * 1000);

		return () => window.clearInterval(interval);
	}, []);

	return (
		<h1 className='text-3xl leading-tight'>
			<span>{greeting} </span>
			{firstName ? <span className='text-muted-foreground'>{firstName},</span> : null}
		</h1>
	);
};
