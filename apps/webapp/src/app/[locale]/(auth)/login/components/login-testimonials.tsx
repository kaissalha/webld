"use client";

import { useEffect, useState } from "react";

import { AnimatePresence, LazyMotion, domAnimation } from "motion/react";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";

const SLIDE_COUNT = 4;

const quoteDecor = (
	<div className='absolute inset-s-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform opacity-2 rtl:translate-x-1/2'>
		<svg
			aria-hidden
			className='h-55 w-55 object-contain'
			fill='none'
			height='220'
			viewBox='0 0 6 5'
			width='220'
			xmlns='http://www.w3.org/2000/svg'
		>
			<path
				d='M4.55 4.83C4.16 4.83 3.84 4.68 3.59 4.4C3.35 4.11 3.23 3.71 3.23 3.21C3.23 2.64 3.41 2.1 3.77 1.59C4.13 1.07 4.69 0.62 5.45 0.22L5.77 0.67C5.12 1.05 4.69 1.44 4.47 1.82C4.26 2.21 4.15 2.63 4.15 3.08L3.68 3.82C3.68 3.52 3.77 3.28 3.95 3.1C4.14 2.91 4.38 2.81 4.67 2.81C4.95 2.81 5.18 2.9 5.37 3.08C5.57 3.26 5.66 3.5 5.66 3.8C5.66 4.09 5.56 4.34 5.36 4.54C5.15 4.73 4.88 4.83 4.55 4.83ZM1.5 4.83C1.12 4.83 0.8 4.68 0.55 4.4C0.31 4.11 0.19 3.71 0.19 3.21C0.19 2.64 0.37 2.1 0.73 1.59C1.09 1.07 1.65 0.62 2.4 0.22L2.73 0.67C2.08 1.05 1.65 1.44 1.43 1.82C1.22 2.21 1.11 2.63 1.11 3.08L0.64 3.82C0.64 3.52 0.73 3.28 0.91 3.1C1.1 2.91 1.34 2.81 1.63 2.81C1.91 2.81 2.14 2.9 2.33 3.08C2.52 3.26 2.62 3.5 2.62 3.8C2.62 4.09 2.52 4.34 2.31 4.54C2.11 4.73 1.84 4.83 1.5 4.83Z'
				fill='white'
			/>
		</svg>
	</div>
);

export const LoginTestimonials = () => {
	const t = useTranslations("account.login.testimonials");
	const [current, setCurrent] = useState(() => Math.floor(Math.random() * SLIDE_COUNT));

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrent((prev) => (prev + 1) % SLIDE_COUNT);
		}, 6000);

		return () => {
			clearInterval(interval);
		};
	}, []);

	const body = (() => {
		if (current === 0) {
			return (
				<p className='ps-4 font-sans text-2xl leading-relaxed text-white/40'>
					{t("slide0.lead")}
					{t("slide0.punct")}
					<span className='text-white'>{t("slide0.highlight")}</span>
				</p>
			);
		}
		if (current === 1) {
			return (
				<p className='ps-4 font-sans text-2xl leading-relaxed text-white/40'>
					<span className='text-white'>{t("slide1.lead")}</span>
					{t("slide1.punct")}
					{t("slide1.highlight")}
				</p>
			);
		}
		if (current === 2) {
			return (
				<p className='ps-4 font-sans text-2xl leading-relaxed text-white/40'>
					<span className='text-white'>{t("slide2.lead")}</span>
					{t("slide2.punct")}
					{t("slide2.highlight")}
				</p>
			);
		}
		return (
			<p className='ps-4 font-sans text-2xl leading-relaxed text-white/40'>
				<span className='text-white'>{t("slide3.lead")}</span>
				{t("slide3.punct")}
				{t("slide3.highlight")}
			</p>
		);
	})();

	const attribution = (() => {
		if (current === 0) {
			return (
				<p className='font-sans text-sm text-white/40'>
					{t("slide0.name")}, {t("slide0.role")}
				</p>
			);
		}
		if (current === 1) {
			return (
				<p className='font-sans text-sm text-white/40'>
					{t("slide1.name")}, {t("slide1.role")}
				</p>
			);
		}
		if (current === 2) {
			return (
				<p className='font-sans text-sm text-white/40'>
					{t("slide2.name")}, {t("slide2.role")}
				</p>
			);
		}
		return (
			<p className='font-sans text-sm text-white/40'>
				{t("slide3.name")}, {t("slide3.role")}
			</p>
		);
	})();

	return (
		<div className='relative flex h-80 items-center justify-center'>
			<LazyMotion features={domAnimation}>
				<AnimatePresence mode='wait'>
					<m.div
						key={current}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3 }}
						className='space-y-4 text-center'
					>
						<m.div
							initial={{ filter: "blur(2px)", opacity: 0, y: 10 }}
							animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
							transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
							className='relative mx-auto max-w-lg'
						>
							{quoteDecor}
							{body}
						</m.div>

						<m.div
							initial={{ filter: "blur(2px)", opacity: 0, y: 10 }}
							animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
							transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
						>
							{attribution}
						</m.div>
					</m.div>
				</AnimatePresence>
			</LazyMotion>
		</div>
	);
};
