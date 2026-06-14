"use client";

import { useCallback, useState } from "react";

import { useTranslations } from "next-intl";

import { Logo } from "@/components/logo";
import { useAuthLoginFlowStore } from "@/hooks/auth-login-flow-store";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@webld/ui/components/button";
import { toast } from "@webld/ui/components/sonner";

import { EmailLoginForm } from "./components/email-login-form";
import { LoginGoogleButton } from "./components/login-google-button";
import { LoginVideoBackground } from "./components/login-video-background";
import { OTPVerificationForm } from "./components/otp-verification-form";

export const LoginPageClient = () => {
	const t = useTranslations("account.login");
	const [isEmailPath, setIsEmailPath] = useState(false);
	const { isOtpSent, email, otpSentAt, beginOtp, reset } = useAuthLoginFlowStore((s) => ({
		isOtpSent: s.isOtpSent,
		email: s.email,
		otpSentAt: s.otpSentAt,
		beginOtp: s.beginOtp,
		reset: s.reset,
	}));

	const handleEmailSubmit = useCallback(
		async (submittedEmail: string) => {
			const result = await authClient.emailOtp.sendVerificationOtp({
				email: submittedEmail,
				type: "sign-in",
			});

			if (result.error) {
				toast.error(t("errors.invalidCredentials"));
				return;
			}

			beginOtp({ email: submittedEmail });
		},
		[beginOtp, t]
	);

	const handleBack = useCallback(() => {
		reset();
	}, [reset]);

	const handleBackToMethods = useCallback(() => {
		setIsEmailPath(false);
	}, []);

	return (
		<div className='bg-background relative flex min-h-dvh'>
			<nav className='pointer-events-none fixed top-0 right-0 left-0 z-50 w-full'>
				<div className='relative flex items-center px-4 py-3 sm:px-4 md:px-4 lg:px-4 xl:py-4 xl:px-6 2xl:px-8'>
					<Link
						href='/'
						className='pointer-events-auto flex items-center gap-2 transition-opacity duration-200 hover:opacity-80 active:opacity-80'
					>
						<div className='h-6 w-6'>
							<Logo className='text-foreground h-full w-full size-8' />
						</div>
					</Link>
				</div>
			</nav>

			<div className='flex w-full flex-col items-center justify-center p-8 pb-2 lg:w-1/2 lg:p-12'>
				<div className='flex h-full w-full max-w-md flex-col'>
					<div className='flex flex-1 flex-col justify-center space-y-8'>
						{isOtpSent ? (
							<OTPVerificationForm email={email} otpSentAt={otpSentAt} onBack={handleBack} />
						) : (
							<>
								<div className='space-y-1 text-center'>
									<h1 className='text-foreground font-sans text-2xl font-semibold tracking-tight text-balance sm:text-3xl'>
										{t("heroTitle")}
									</h1>
									<p className='text-muted-foreground font-sans text-sm'>{t("heroSubtitle")}</p>
								</div>

								<div className='w-full space-y-3'>
									<LoginGoogleButton />
									{isEmailPath ? (
										<EmailLoginForm onBack={handleBackToMethods} onSubmit={handleEmailSubmit} />
									) : (
										<Button
											type='button'
											className='w-full'
											size='xl'
											variant='outline'
											onClick={() => {
												setIsEmailPath(true);
											}}
										>
											{t("emailCta")}
										</Button>
									)}
								</div>
							</>
						)}
					</div>

					<div className='text-center mt-auto'>
						<p className='text-muted-foreground font-sans text-xs leading-relaxed'>
							{t("legal.acknowledge")}{" "}
							<Link
								href='/privacy'
								className='text-muted-foreground underline transition-colors hover:text-foreground'
							>
								{t("legal.termsPath")}
							</Link>
							{t("legal.betweenClauses")}
							<Link
								href='/privacy'
								className='text-muted-foreground underline transition-colors hover:text-foreground'
							>
								{t("legal.privacyPath")}
							</Link>
							{t("legal.ending")}
						</p>
					</div>
				</div>
			</div>

			<LoginVideoBackground />
		</div>
	);
};
