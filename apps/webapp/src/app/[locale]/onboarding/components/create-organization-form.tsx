"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { LogoPicker } from "@/components/organization/logo-picker";
import { Button } from "@starter/ui/components/button";
import { Field, FieldControl, FieldError, FieldLabel } from "@starter/ui/components/field";
import { Form } from "@starter/ui/components/form";

const createOrganizationSchema = ({ invalidMessage }: { invalidMessage: string }) =>
	z.object({
		name: z.string().trim().min(1, { message: invalidMessage }),
	});

type CreateOrganizationFormValues = z.infer<ReturnType<typeof createOrganizationSchema>>;

type CreateOrganizationFormProps = {
	isSubmitting: boolean;
	onSubmit: ({ name, logoFile }: { name: string; logoFile?: File | null }) => Promise<string | null>;
};

export const CreateOrganizationForm = ({ isSubmitting, onSubmit }: CreateOrganizationFormProps) => {
	const t = useTranslations("onboarding");
	const tLogo = useTranslations("organizationLogo");
	const form = useForm<CreateOrganizationFormValues>({
		resolver: zodResolver(
			createOrganizationSchema({
				invalidMessage: t("errors.invalidOrganizationName"),
			})
		),
		defaultValues: {
			name: "",
		},
	});
	const [logoFile, setLogoFile] = useState<File | null>(null);
	const [logoPreview, setLogoPreview] = useState<string | null>(null);
	const watchedName = useWatch({
		control: form.control,
		name: "name",
		defaultValue: "",
	});

	useEffect(() => {
		return () => {
			if (logoPreview) {
				URL.revokeObjectURL(logoPreview);
			}
		};
	}, [logoPreview]);

	const handleSubmit = form.handleSubmit(async (values) => {
		const errorMessage = await onSubmit({
			name: values.name,
			logoFile,
		});

		if (errorMessage) {
			form.setError("root", { message: errorMessage });
		}
	});

	const handleLogoSelect = ({ file, previewUrl }: { file: File; previewUrl: string }) => {
		if (logoPreview) {
			URL.revokeObjectURL(logoPreview);
		}

		setLogoFile(file);
		setLogoPreview(previewUrl);
	};

	const handleLogoRemove = () => {
		if (logoPreview) {
			URL.revokeObjectURL(logoPreview);
		}

		setLogoFile(null);
		setLogoPreview(null);
	};

	return (
		<Form className='space-y-6' onSubmit={handleSubmit}>
			<Field name='name'>
				<FieldLabel>{t("fields.organizationName.label")}</FieldLabel>
				<FieldControl
					{...form.register("name")}
					autoComplete='organization'
					placeholder={t("fields.organizationName.placeholder")}
					aria-label={t("fields.organizationName.label")}
					className='h-11'
				/>
				{form.formState.errors.name ? <FieldError>{form.formState.errors.name.message}</FieldError> : null}
			</Field>

			<div className='space-y-2'>
				<p className='inline-flex items-center gap-2 text-sm/4'>
					<span className='font-medium'>{tLogo("fieldLabel")}</span>
					<span className='font-normal text-muted-foreground'>({tLogo("optional")})</span>
				</p>
				<LogoPicker
					name={watchedName}
					previewUrl={logoPreview}
					disabled={isSubmitting}
					maxSizeMb={4}
					onFileSelect={handleLogoSelect}
					onRemove={logoFile ? handleLogoRemove : undefined}
				/>
			</div>

			{form.formState.errors.root ? (
				<p className='text-sm text-destructive'>{form.formState.errors.root.message}</p>
			) : null}

			<Button type='submit' size='xl' className='w-full' disabled={isSubmitting}>
				{isSubmitting ? t("createActionPending") : t("createAction")}
			</Button>
		</Form>
	);
};
