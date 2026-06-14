import * as React from "react";

import { Body, Button, Container, Font, Heading, Html, Preview, Section, Tailwind, Text } from "react-email";

import { Footer } from "../components/footer";
import { getI18n } from "../locales";

type Props = {
	inviteLink?: string;
	inviterEmail?: string;
	inviterName?: string;
	organizationName?: string;
	recipientEmail?: string;
	role?: string;
	locale?: string;
};

const InvitationEmail = ({
	inviteLink = "https://example.com/accept-invitation/invitation-id",
	inviterEmail = "jane@example.com",
	inviterName = "Jane Doe",
	organizationName = "Acme",
	recipientEmail = "you@example.com",
	role = "member",
	locale = "en",
}: Props) => {
	const { t } = getI18n({ locale });
	const signatureLines = t("invitation.signature").split(/<br\s*\/?>/);

	const displayInviter = inviterName?.trim().length ? inviterName : inviterEmail;

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
				<Preview>{t("invitation.preview", { organizationName })}</Preview>

				<Body className='mx-auto my-auto bg-white'>
					<Container
						className='mx-auto my-10 max-w-150 border-transparent p-5 md:border-stone-200'
						style={{ borderStyle: "solid", borderWidth: 1 }}
					>
						<Heading className='mx-0 my-7.5 p-0 text-center text-xl font-normal text-neutral-950'>
							{t("invitation.title", { organizationName })}
						</Heading>

						<br />

						<span className='font-medium'>{t("invitation.greeting")}</span>
						<Text className='text-neutral-950'>
							{t("invitation.intro", {
								inviter: displayInviter,
								organizationName,
								role,
							})}
							<br />
							<br />
							{t("invitation.description", { recipientEmail })}
						</Text>

						<Section className='my-6 text-center'>
							<Button
								href={inviteLink}
								className='rounded-lg bg-neutral-950 px-6 py-3 text-center text-sm font-medium text-white'
							>
								{t("invitation.cta")}
							</Button>
						</Section>

						<Text className='text-sm text-gray-500'>
							{t("invitation.fallback")}
							<br />
							<a href={inviteLink} className='break-all text-neutral-950 underline'>
								{inviteLink}
							</a>
						</Text>

						<Text className='text-sm text-gray-500'>{t("invitation.not_you")}</Text>

						<br />

						<Text className='text-gray-500'>
							{signatureLines.map((line, index) => (
								<React.Fragment key={line}>
									{index > 0 ? <br /> : null}
									{line}
								</React.Fragment>
							))}
						</Text>

						<br />
						<br />

						<Footer locale={locale} />
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};

export default InvitationEmail;
