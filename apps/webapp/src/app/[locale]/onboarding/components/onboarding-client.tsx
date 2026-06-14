"use client";

import { useTranslations } from "next-intl";

import { Logo } from "@/components/logo";
import { Link } from "@/i18n/navigation";
import { Badge } from "@starter/ui/components/badge";
import { Card, CardHeader, CardTitle } from "@starter/ui/components/card";

import { OnboardingContent } from "./onboarding-content";
import { useOnboardingController } from "./use-onboarding-controller";

type OnboardingClientProps = {
	redirectPath: string;
	userEmail: string;
};

export const OnboardingClient = ({ redirectPath, userEmail }: OnboardingClientProps) => {
	const t = useTranslations("onboarding");
	const {
		hasExistingOrganization,
		hasInvitationLoadError,
		hasRestoreError,
		handleAcceptInvitation,
		handleCreateOrganization,
		handleRestoreOrganization,
		invitations,
		isAcceptingInvitation,
		isCreatingOrganization,
		isLoadingInvitations,
		isLoadingOrganizations,
		isRestoringOrganization,
		pendingInvitationId,
		retryInvitationLoad,
	} = useOnboardingController({
		redirectPath,
	});

	return (
		<main className='bg-background flex min-h-screen'>
			<section className='flex w-full items-center justify-center px-6 py-12 lg:w-[42%] lg:px-12'>
				<div className='w-full max-w-xl space-y-8'>
					<div className='space-y-5'>
						<Link href='/' className='inline-flex items-center gap-3'>
							<Logo className='size-10' />
							<Badge
								variant='outline'
								size='sm'
								className='rounded-full px-3 py-1 text-xs uppercase tracking-widest'
							>
								{t("eyebrow")}
							</Badge>
						</Link>

						<div className='space-y-3'>
							<h1 className='max-w-[14ch] text-4xl font-semibold tracking-tight text-balance'>
								{t("title")}
							</h1>
							<p className='max-w-[48ch] text-base leading-7 text-muted-foreground'>{t("description")}</p>
						</div>
					</div>

					<OnboardingContent
						handleAcceptInvitation={handleAcceptInvitation}
						handleCreateOrganization={handleCreateOrganization}
						handleRestoreOrganization={handleRestoreOrganization}
						hasExistingOrganization={hasExistingOrganization}
						hasInvitationLoadError={hasInvitationLoadError}
						hasRestoreError={hasRestoreError}
						invitations={invitations}
						isAcceptingInvitation={isAcceptingInvitation}
						isCreatingOrganization={isCreatingOrganization}
						isLoadingInvitations={isLoadingInvitations}
						isLoadingOrganizations={isLoadingOrganizations}
						isRestoringOrganization={isRestoringOrganization}
						pendingInvitationId={pendingInvitationId}
						retryInvitationLoad={retryInvitationLoad}
						userEmail={userEmail}
					/>
				</div>
			</section>

			<aside className='relative hidden min-h-screen flex-1 overflow-hidden border-s border-border/60 bg-[radial-gradient(circle_at_top,oklch(0.96_0.02_105)_0%,transparent_35%),linear-gradient(180deg,color-mix(in_oklch,var(--color-muted)_86%,transparent),color-mix(in_oklch,var(--color-background)_92%,transparent))] lg:block'>
				<div className='absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--color-success)_9%,transparent),transparent_42%,color-mix(in_oklch,var(--color-warning)_10%,transparent))]' />
				<div className='relative flex h-full flex-col justify-between px-10 py-12 xl:px-14'>
					<div className='max-w-xl space-y-4'>
						<Badge
							variant='dark'
							size='sm'
							className='rounded-full px-3 py-1 text-xs uppercase tracking-widest'
						>
							{t("sideTitle")}
						</Badge>
						<p className='max-w-[34ch] text-3xl font-semibold tracking-tight text-balance'>
							{t("sideDescription")}
						</p>
					</div>

					<div className='grid gap-4 xl:grid-cols-3'>
						<Card className='border-border/70 bg-background/72 backdrop-blur-sm'>
							<CardHeader className='space-y-2'>
								<CardTitle className='text-lg'>{t("sideItems.invite.title")}</CardTitle>
								<p className='text-sm leading-6 text-muted-foreground'>
									{t("sideItems.invite.description")}
								</p>
							</CardHeader>
						</Card>

						<Card className='border-border/70 bg-background/72 backdrop-blur-sm'>
							<CardHeader className='space-y-2'>
								<CardTitle className='text-lg'>{t("sideItems.create.title")}</CardTitle>
								<p className='text-sm leading-6 text-muted-foreground'>
									{t("sideItems.create.description")}
								</p>
							</CardHeader>
						</Card>

						<Card className='border-border/70 bg-background/72 backdrop-blur-sm'>
							<CardHeader className='space-y-2'>
								<CardTitle className='text-lg'>{t("sideItems.team.title")}</CardTitle>
								<p className='text-sm leading-6 text-muted-foreground'>
									{t("sideItems.team.description")}
								</p>
							</CardHeader>
						</Card>
					</div>
				</div>
			</aside>
		</main>
	);
};
