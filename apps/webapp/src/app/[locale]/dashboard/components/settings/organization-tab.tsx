"use client";

import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { Button } from "@starter/ui/components/button";
import { Input } from "@starter/ui/components/input";
import { Skeleton } from "@starter/ui/components/skeleton";

import { OrganizationLogoUpload } from "./organization-logo-upload";
import { SettingsCard } from "./settings-card";
import { useOrganizationSettingsForm } from "./use-organization-settings-form";

type EditableOrganization = {
	id: string;
	logo?: string | null;
	name: string;
};

const OrganizationSettingsForm = ({
	canEdit,
	organization,
}: {
	canEdit: boolean;
	organization: EditableOrganization;
}) => {
	const t = useTranslations("settings.organization");
	const tCommon = useTranslations("common");
	const { canSave, handleSave, isSaving, name, setName } = useOrganizationSettingsForm({
		canEdit,
		organization,
	});

	return (
		<div className='flex max-w-3xl flex-col gap-6'>
			<SettingsCard
				title={t("name.title")}
				description={t("name.description")}
				footer={
					<Button onClick={handleSave} loading={isSaving} disabled={!canSave} size='sm'>
						{tCommon("save")}
					</Button>
				}
				footerHint={canEdit ? t("name.hint") : t("readOnly")}
			>
				<Input
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder={t("name.placeholder")}
					className='max-w-xs'
					disabled={!canEdit}
				/>
			</SettingsCard>

			<SettingsCard
				title={t("logo.title")}
				description={t("logo.description")}
				footerHint={canEdit ? t("logo.hint") : t("readOnly")}
			>
				<OrganizationLogoUpload canEdit={canEdit} organization={organization} />
			</SettingsCard>
		</div>
	);
};

export const OrganizationTab = () => {
	const t = useTranslations("settings.organization");
	const { data: activeOrganization, isPending: isOrgPending } = authClient.useActiveOrganization();
	const { data: activeMember, isPending: isMemberPending } = authClient.useActiveMember();
	const activeRole = activeMember?.role;
	const canEdit =
		activeRole === "admin" || activeRole === "member" || activeRole === "owner"
			? authClient.organization.checkRolePermission({
					permissions: { organization: ["update"] },
					role: activeRole,
				})
			: false;

	const isLoading = isOrgPending || isMemberPending;

	if (isLoading) {
		return (
			<div className='flex max-w-3xl flex-col gap-6'>
				<div className='rounded-lg border border-border bg-card'>
					<div className='flex flex-col gap-2 p-6'>
						<Skeleton className='h-5 w-40' />
						<Skeleton className='h-4 w-64' />
					</div>
					<div className='px-6 pb-6'>
						<Skeleton className='h-9 w-full max-w-xs' />
					</div>
					<div className='flex items-center justify-between gap-4 border-t border-border bg-muted/30 px-6 py-4'>
						<Skeleton className='h-3 w-36' />
						<Skeleton className='h-8 w-16' />
					</div>
				</div>
				<div className='rounded-lg border border-border bg-card'>
					<div className='flex flex-col gap-2 p-6'>
						<Skeleton className='h-5 w-32' />
						<Skeleton className='h-4 w-72' />
					</div>
					<div className='px-6 pb-6'>
						<Skeleton className='h-9 w-full max-w-md' />
					</div>
					<div className='flex items-center justify-between gap-4 border-t border-border bg-muted/30 px-6 py-4'>
						<Skeleton className='h-3 w-44' />
						<Skeleton className='h-8 w-16' />
					</div>
				</div>
			</div>
		);
	}

	if (!activeOrganization) {
		return (
			<div className='flex max-w-3xl flex-col gap-6'>
				<p className='text-sm text-muted-foreground'>{t("empty")}</p>
			</div>
		);
	}

	return (
		<OrganizationSettingsForm
			key={`${activeOrganization.id}:${activeOrganization.name}:${activeOrganization.logo ?? ""}`}
			canEdit={canEdit}
			organization={activeOrganization}
		/>
	);
};
