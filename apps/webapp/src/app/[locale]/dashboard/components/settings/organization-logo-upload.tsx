"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";

import { LogoPicker } from "@/components/organization/logo-picker";
import { authClient } from "@/lib/auth-client";
import { uploadFromClient } from "@/lib/storage";
import { toast } from "@webld/ui/components/sonner";
import { file as fileUtils } from "@webld/utils";

type OrganizationLogoUploadProps = {
	canEdit: boolean;
	organization: {
		id: string;
		logo?: string | null;
		name: string;
	};
};

const maxLogoMb = 4;

const uploadOrganizationLogo = async ({ file, organizationId }: { file: File; organizationId: string }) => {
	try {
		const pathname = `organizations/${organizationId}/logo-${Date.now()}.${fileUtils.getFileExtension({
			filename: file.name,
			mediaType: file.type,
			maxNameExtensionLength: 5,
			fallback: "bin",
		})}`;

		return await uploadFromClient({
			pathname,
			file,
			handleUploadUrl: "/api/media",
			payload: {
				organizationId,
				access: "public",
				maxFileSizeMb: maxLogoMb,
			},
		});
	} catch {
		return null;
	}
};

export const OrganizationLogoUpload = ({ canEdit, organization }: OrganizationLogoUploadProps) => {
	const t = useTranslations("organizationLogo");
	const tCommon = useTranslations("common");
	const [isUploading, setIsUploading] = useState(false);
	const [optimisticPreview, setOptimisticPreview] = useState<string | null>(null);

	const resetUploadState = ({ previewUrl }: { previewUrl?: string }) => {
		setIsUploading(false);
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		setOptimisticPreview(null);
	};

	const handleFileSelect = async ({ file, previewUrl }: { file: File; previewUrl: string }) => {
		if (!canEdit) {
			return;
		}

		setOptimisticPreview(previewUrl);
		setIsUploading(true);

		const blob = await uploadOrganizationLogo({
			file,
			organizationId: organization.id,
		});

		if (!blob) {
			toast.error(t("errors.upload"));
			resetUploadState({ previewUrl });
			return;
		}

		const result = await authClient.organization.update({
			data: { logo: blob.url },
			organizationId: organization.id,
		});

		if (result.error) {
			toast.error(result.error.message ?? tCommon("saveError"));
			resetUploadState({ previewUrl });
			return;
		}

		toast.success(tCommon("saved"));
		resetUploadState({ previewUrl });
	};

	const handleRemove = async () => {
		if (!canEdit) {
			return;
		}

		setIsUploading(true);

		const result = await authClient.organization.update({
			data: { logo: "" },
			organizationId: organization.id,
		});

		if (result.error) {
			toast.error(result.error.message ?? tCommon("saveError"));
			resetUploadState({});
			return;
		}

		toast.success(tCommon("saved"));
		resetUploadState({});
	};

	const previewUrl = optimisticPreview ?? organization.logo ?? null;

	return (
		<LogoPicker
			name={organization.name}
			previewUrl={previewUrl}
			isUploading={isUploading}
			disabled={!canEdit}
			maxSizeMb={maxLogoMb}
			onFileSelect={handleFileSelect}
			onRemove={organization.logo ? handleRemove : undefined}
		/>
	);
};
