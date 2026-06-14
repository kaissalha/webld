"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import validator from "validator";
import { z } from "zod";

import type { TranslationFunction } from "@/types/translation";
import { Button } from "@starter/ui/components/button";
import { Field, FieldControl, FieldError, FieldLabel } from "@starter/ui/components/field";
import { Form } from "@starter/ui/components/form";

const loginSchema = (t: TranslationFunction<"account.login">) =>
	z.object({
		email: z
			.string()
			.min(1, { message: t("fields.email.errors.required") })
			.refine((value) => validator.isEmail(value), { message: t("fields.email.errors.invalid") }),
	});

type LoginFormValues = z.infer<ReturnType<typeof loginSchema>>;

type EmailLoginFormProps = {
	onBack?: () => void;
	onSubmit: (email: string) => Promise<void>;
};

export const EmailLoginForm = ({ onBack, onSubmit }: EmailLoginFormProps) => {
	const t = useTranslations("account.login");
	const form = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema(t)),
		defaultValues: {
			email: "",
		},
	});

	return (
		<Form onSubmit={form.handleSubmit(async (input) => onSubmit(input.email))} className='w-full space-y-4'>
			<Field name='email'>
				<FieldLabel>{t("fields.email.label")}</FieldLabel>
				<FieldControl
					{...form.register("email")}
					type='email'
					autoComplete='email'
					placeholder={t("fields.email.placeholderAlt")}
					aria-label={t("fields.email.label")}
					aria-invalid={Boolean(form.formState.errors.email)}
				/>
				{form.formState.errors.email ? <FieldError>{form.formState.errors.email.message}</FieldError> : null}
			</Field>

			<Button
				type='submit'
				className='w-full'
				disabled={form.formState.isSubmitting}
				loading={form.formState.isSubmitting}
				size='xl'
				variant='default'
			>
				{form.formState.isSubmitting ? t("signingIn") : t("emailContinue")}
			</Button>

			{onBack ? (
				<div className='flex justify-center pt-1'>
					<Button type='button' variant='ghost' size='sm' onClick={onBack}>
						{t("backFromEmailStep")}
					</Button>
				</div>
			) : null}
		</Form>
	);
};
