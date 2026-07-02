import * as React from "react";

import { Body, Container, Font, Heading, Html, Preview, Tailwind, Text } from "react-email";

import { Footer } from "../components/footer";
import { getI18n } from "../locales";

type Props = {
	otp?: string;
	locale?: string;
};

export const OtpEmail = ({ otp = "123456", locale = "en" }: Props) => {
	const { markup, t } = getI18n({ locale });

	return (
		<Html>
			<Tailwind>
				<head>
					<Font
						fontFamily='Geist'
						fallbackFontFamily='Helvetica'
						webFont={{
							url: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.1/files/geist-sans-latin-400-normal.woff2",
							format: "woff2",
						}}
						fontWeight={400}
						fontStyle='normal'
					/>

					<Font
						fontFamily='Geist'
						fallbackFontFamily='Helvetica'
						webFont={{
							url: "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.1/files/geist-sans-latin-500-normal.woff2",
							format: "woff2",
						}}
						fontWeight={500}
						fontStyle='normal'
					/>
				</head>
				<Preview>{t("otp.intro")}</Preview>

				<Body className='mx-auto my-auto bg-white'>
					<Container
						className='mx-auto my-10 max-w-150 border-transparent p-5 md:border-stone-200'
						style={{ borderStyle: "solid", borderWidth: 1 }}
					>
						<Heading className='mx-0 my-7.5 p-0 text-center text-xl font-normal text-neutral-950'>
							{t("otp.title")}
						</Heading>

						<br />

						<span className='font-medium'>{t("otp.greeting")}</span>
						<Text className='text-neutral-950'>
							{t("otp.intro")}
							<br />
							<br />
							{t("otp.description")}
						</Text>

						<div
							style={{
								background: "#f4f4f4",
								borderRadius: "8px",
								padding: "24px",
								textAlign: "center",
								margin: "24px 0",
							}}
						>
							<Text className='mb-2 text-sm font-medium text-gray-500'>{t("otp.code_label")}</Text>
							<Text className='m-0 text-3xl font-bold tracking-wide text-neutral-950'>{otp}</Text>
						</div>

						<Text className='text-sm text-gray-500'>
							{t("otp.expires")}
							<br />
							<br />
							{t("otp.not_requested")}
						</Text>

						<br />

						<Text className='text-gray-500'>{markup("otp.signature", { br: () => <br /> })}</Text>

						<br />
						<br />

						<Footer locale={locale} />
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};

export default OtpEmail;
