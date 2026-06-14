import * as React from "react";

import { Text, View } from "@react-pdf/renderer";

import { getI18n } from "../locales";
import { baseStyles } from "./styles";

type FooterProps = {
	companyName?: string;
	pageNumber?: boolean;
	locale?: string;
};

export const Footer = ({ companyName = "Your Company", pageNumber = true, locale = "en" }: FooterProps) => {
	const { t } = getI18n({ locale });

	return (
		<View style={baseStyles.footer} fixed>
			<Text>{t("components.footer.copyright", { year: new Date().getFullYear(), companyName })}</Text>
			{pageNumber && (
				<Text
					render={({ pageNumber, totalPages }) => t("components.footer.page", { pageNumber, totalPages })}
				/>
			)}
		</View>
	);
};
