"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@webld/ui/components/button";
import { Form } from "@webld/ui/components/form";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@webld/ui/components/input-otp";

const otpFormSchema = (invalidMessage: string) =>
	z.object({
		otp: z.string().length(6, { message: invalidMessage }).regex(/^\d+$/, { message: invalidMessage }),
	});

type OtpFormValues = z.infer<ReturnType<typeof otpFormSchema>>;

type OTPVerificationFormProps = {
	email: string;
	otpSentAt: Date | null;
	onBack?: () => void;
};

export const OTPVerificationForm = ({ email, otpSentAt, onBack }: OTPVerificationFormProps) => {
	const t = useTranslations("account.login");
	const router = useRouter();

	const form = useForm<OtpFormValues>({
		resolver: zodResolver(otpFormSchema(t("errors.invalidOtp"))),
		defaultValues: { otp: "" },
	});

	const onSubmit = form.handleSubmit(async (values) => {
		const result = await authClient.signIn.emailOtp({
			email,
			otp: values.otp,
		});

		if (result.error) {
			form.setError("root", { message: result.error.message ?? t("errors.invalidOtp") });
			return;
		}

		router.push("/dashboard");
	});

	return (
		<Form className='flex w-full flex-col items-center justify-center gap-6' onSubmit={onSubmit}>
			<div className='space-y-2 text-center'>
				<h1 className='text-foreground mb-2 font-display text-lg text-balance lg:text-xl'>{t("titleOtp")}</h1>
				<p className='font-sans text-sm text-muted-foreground'>{t("otpDescription")}</p>
				<p className='text-foreground text-sm font-medium'>{email}</p>
				{otpSentAt ? (
					<p className='font-sans text-xs text-muted-foreground'>
						{t("otpRequestedRelative", {
							relativeTime: formatDistanceToNow(otpSentAt, { addSuffix: true, locale: enUS }),
						})}
					</p>
				) : null}
			</div>

			<Controller
				control={form.control}
				name='otp'
				render={({ field: { onChange, value } }) => (
					<InputOTP
						maxLength={6}
						value={value}
						onChange={onChange}
						containerClassName='flex items-center justify-center'
					>
						<InputOTPGroup>
							<InputOTPSlot index={0} />
							<InputOTPSlot index={1} />
							<InputOTPSlot index={2} />
						</InputOTPGroup>
						<InputOTPSeparator />
						<InputOTPGroup>
							<InputOTPSlot index={3} />
							<InputOTPSlot index={4} />
							<InputOTPSlot index={5} />
						</InputOTPGroup>
					</InputOTP>
				)}
			/>

			{form.formState.errors.otp ? (
				<p className='text-destructive text-center text-sm'>{form.formState.errors.otp.message}</p>
			) : null}
			{form.formState.errors.root ? (
				<p className='text-destructive text-center text-sm'>{form.formState.errors.root.message}</p>
			) : null}

			<Button
				type='submit'
				className='w-full'
				disabled={form.formState.isSubmitting}
				loading={form.formState.isSubmitting}
				size='xl'
				variant='default'
			>
				{form.formState.isSubmitting ? t("verifying") : t("verify")}
			</Button>

			{onBack ? (
				<Button type='button' variant='ghost' size='sm' onClick={onBack} className='text-muted-foreground'>
					{t("backToEmail")}
				</Button>
			) : null}
		</Form>
	);
};
