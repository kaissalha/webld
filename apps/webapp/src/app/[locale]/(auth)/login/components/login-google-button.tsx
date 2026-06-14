"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { Button } from "@webld/ui/components/button";

import { GoogleColoredMark } from "./google-colored-mark";

export const LoginGoogleButton = () => {
	const t = useTranslations("account.login");
	const [isLoading, setIsLoading] = useState(false);

	return (
		<Button
			type='button'
			className='w-full'
			loading={isLoading}
			size='xl'
			variant='default'
			onClick={async () => {
				setIsLoading(true);
				await authClient.signIn
					.social({
						provider: "google",
						callbackURL: "/dashboard",
					})
					.finally(() => {
						setIsLoading(false);
					});
			}}
		>
			<GoogleColoredMark />
			{t("withGoogle")}
		</Button>
	);
};
