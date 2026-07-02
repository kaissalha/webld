import * as React from "react";

import { Body, Container, Font, Heading, Html, Preview, Tailwind, Text } from "react-email";

import { Footer } from "../components/footer";
import { getI18n } from "../locales";

type Props = {
	fullName?: string;
	locale?: string;
};

export const WelcomeEmail = ({ fullName = "Viktor Hofte", locale = "en" }: Props) => {
	const firstName = fullName.split(" ").at(0);
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
				<Preview>{t("welcome.intro")}</Preview>

				<Body className='mx-auto my-auto bg-white'>
					<Container
						className='mx-auto my-10 max-w-150 border-transparent p-5 md:border-stone-200'
						style={{ borderStyle: "solid", borderWidth: 1 }}
					>
						<Heading className='mx-0 my-7.5 p-0 text-center text-xl font-normal text-neutral-950'>
							{t("welcome.title")}
						</Heading>

						<br />

						<span className='font-medium'>{t("welcome.greeting", { firstName })}</span>
						<Text className='text-neutral-950'>
							{t("welcome.intro")}
							<br />
							<br />
							{t("welcome.description")}
							<br />
							<br />
							{t("welcome.support")}
						</Text>

						<br />

						<Text className='text-gray-500'>{markup("welcome.signature", { br: () => <br /> })}</Text>

						<br />
						<br />

						<Footer locale={locale} />
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};

export default WelcomeEmail;
