import * as React from "react";

import { Column, Img, Link, Row, Section, Text } from "react-email";

import { getI18n } from "../locales";

type Props = {
	locale?: string;
};

export const Footer = ({ locale = "en" }: Props) => {
	const { t } = getI18n({ locale });

	return (
		<Section className='text-center'>
			<table className='w-full'>
				<tr className='w-full'>
					<td align='center'>
						<Img
							alt='React Email logo'
							height='42'
							src='https://react.email/static/logo-without-background.png'
						/>
					</td>
				</tr>
				<tr className='w-full'>
					<td align='center'>
						<Text className='my-2 text-base font-semibold leading-6 text-gray-900'>
							{t("components.footer.company")}
						</Text>
						<Text className='mb-0 mt-1 text-base leading-6 text-gray-500'>
							{t("components.footer.tagline")}
						</Text>
					</td>
				</tr>
				<tr>
					<td align='center'>
						<Row className='table-cell h-11 w-14 align-bottom'>
							<Column className='pe-2'>
								<Link href='#'>
									<Img
										alt='Facebook'
										height='36'
										src='https://react.email/static/facebook-logo.png'
										width='36'
									/>
								</Link>
							</Column>
							<Column className='pe-2'>
								<Link href='#'>
									<Img alt='X' height='36' src='https://react.email/static/x-logo.png' width='36' />
								</Link>
							</Column>
							<Column>
								<Link href='#'>
									<Img
										alt='Instagram'
										height='36'
										src='https://react.email/static/instagram-logo.png'
										width='36'
									/>
								</Link>
							</Column>
						</Row>
					</td>
				</tr>
				<tr>
					<td align='center'>
						<Text className='my-2 text-base font-semibold leading-6 text-gray-500'>
							{t("components.footer.address")}
						</Text>
						<Text className='mb-0 mt-1 text-base font-semibold leading-6 text-gray-500'>
							{t("components.footer.contact")}
						</Text>
					</td>
				</tr>
			</table>
		</Section>
	);
};
