"use client";

import { useTranslations } from "next-intl";

import { Button } from "@starter/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@starter/ui/components/card";
import { Spinner } from "@starter/ui/components/spinner";

import { CreateOrganizationForm } from "./create-organization-form";
import { InvitationList } from "./invitation-list";
import type { OnboardingInvitation } from "./use-onboarding-controller";

type OnboardingStatusCardProps = {
	actionLabel?: string;
	description: string;
	onAction?: () => void;
	title: string;
	variant: "error" | "loading";
};

const OnboardingStatusCard = ({ actionLabel, description, onAction, title, variant }: OnboardingStatusCardProps) => {
	return (
		<Card className='border-border/70 bg-background/90 shadow-[0_20px_50px_-28px_color-mix(in_oklch,var(--color-foreground)_12%,transparent)]'>
			<CardHeader className={variant === "loading" ? "items-start gap-4" : "space-y-2"}>
				{variant === "loading" ? (
					<div className='rounded-full border border-border/80 bg-muted/80 p-2.5'>
						<Spinner className='size-4' />
					</div>
				) : null}
				<div className='space-y-2'>
					<CardTitle className='text-xl tracking-tight'>{title}</CardTitle>
					<p className='text-sm text-muted-foreground'>{description}</p>
				</div>
			</CardHeader>
			{onAction && actionLabel ? (
				<CardContent>
					<Button type='button' size='xl' className='w-full' onClick={onAction}>
						{actionLabel}
					</Button>
				</CardContent>
			) : null}
		</Card>
	);
};

type OnboardingContentProps = {
	handleAcceptInvitation: ({ invitationId }: { invitationId: string }) => Promise<void>;
	handleCreateOrganization: ({ name, logoFile }: { name: string; logoFile?: File | null }) => Promise<string | null>;
	handleRestoreOrganization: () => Promise<void>;
	hasExistingOrganization: boolean;
	hasInvitationLoadError: boolean;
	hasRestoreError: boolean;
	invitations: OnboardingInvitation[];
	isAcceptingInvitation: boolean;
	isCreatingOrganization: boolean;
	isLoadingInvitations: boolean;
	isLoadingOrganizations: boolean;
	isRestoringOrganization: boolean;
	pendingInvitationId: string | null;
	retryInvitationLoad: () => Promise<unknown>;
	userEmail: string;
};

export const OnboardingContent = ({
	handleAcceptInvitation,
	handleCreateOrganization,
	handleRestoreOrganization,
	hasExistingOrganization,
	hasInvitationLoadError,
	hasRestoreError,
	invitations,
	isAcceptingInvitation,
	isCreatingOrganization,
	isLoadingInvitations,
	isLoadingOrganizations,
	isRestoringOrganization,
	pendingInvitationId,
	retryInvitationLoad,
	userEmail,
}: OnboardingContentProps) => {
	const t = useTranslations("onboarding");
	const tCommon = useTranslations("common");

	if (isLoadingOrganizations) {
		return <OnboardingStatusCard title={t("title")} description={t("description")} variant='loading' />;
	}

	if (hasExistingOrganization) {
		if (hasRestoreError) {
			return (
				<OnboardingStatusCard
					title={t("restoreErrorTitle")}
					description={t("restoreErrorDescription")}
					actionLabel={t("restoreAction")}
					onAction={() => void handleRestoreOrganization()}
					variant='error'
				/>
			);
		}

		return (
			<OnboardingStatusCard
				title={t("restoringTitle")}
				description={t("restoringDescription")}
				variant='loading'
			/>
		);
	}

	if (isLoadingInvitations || isRestoringOrganization) {
		return (
			<OnboardingStatusCard title={t("inviteTitle")} description={t("loadingInvitations")} variant='loading' />
		);
	}

	if (hasInvitationLoadError) {
		return (
			<OnboardingStatusCard
				title={t("inviteTitle")}
				description={t("errors.loadInvitations")}
				actionLabel={tCommon("retry")}
				onAction={() => void retryInvitationLoad()}
				variant='error'
			/>
		);
	}

	if (invitations.length > 0) {
		return (
			<InvitationList
				invitations={invitations}
				isAcceptingInvitation={isAcceptingInvitation}
				onAcceptInvitation={handleAcceptInvitation}
				pendingInvitationId={pendingInvitationId}
			/>
		);
	}

	return (
		<Card className='border-border/70 bg-background/90 shadow-[0_20px_50px_-28px_color-mix(in_oklch,var(--color-foreground)_12%,transparent)]'>
			<CardHeader className='space-y-2'>
				<CardTitle className='text-xl tracking-tight'>{t("createTitle")}</CardTitle>
				<p className='text-sm text-muted-foreground'>{t("createDescription", { email: userEmail })}</p>
			</CardHeader>
			<CardContent className='space-y-5'>
				<p className='text-sm text-muted-foreground'>{t("createHelper")}</p>
				<CreateOrganizationForm isSubmitting={isCreatingOrganization} onSubmit={handleCreateOrganization} />
			</CardContent>
		</Card>
	);
};
