"use client";

import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@webld/ui/components/button";
import { Skeleton } from "@webld/ui/components/skeleton";

import { InviteMemberDialog } from "./team/invite-member-dialog";
import { ManageMemberDialog } from "./team/manage-member-dialog";
import { TeamMemberRow } from "./team/team-member-row";
import { useTeamTabController } from "./team/use-team-tab-controller";

const teamSkeletonRowKeys = ["team-skeleton-a", "team-skeleton-b", "team-skeleton-c"];

export const TeamTab = () => {
	const t = useTranslations("settings.team");
	const {
		activeOrganization,
		canManageInvitations,
		canManageMembers,
		currentMemberId,
		entries,
		handleConfirmManage,
		handleManageOpenChange,
		handleOpenManage,
		handleSendInvite,
		isInviteOpen,
		isLoading,
		isManageOpen,
		isProcessingManage,
		isSendingInvite,
		managedEntry,
		openInviteDialog,
		setInviteOpen,
	} = useTeamTabController();

	if (isLoading) {
		return (
			<div className='flex max-w-3xl flex-col gap-6'>
				<div className='flex items-center justify-between gap-4'>
					<Skeleton className='h-6 w-32' />
					<Skeleton className='h-9 w-32' />
				</div>
				<div className='overflow-hidden rounded-lg border border-border bg-card'>
					{teamSkeletonRowKeys.map((key) => (
						<div
							key={key}
							className='flex items-center justify-between gap-4 border-b border-border px-6 py-4 last:border-b-0'
						>
							<div className='flex items-center gap-3'>
								<Skeleton className='size-9 rounded-full' />
								<div className='space-y-2'>
									<Skeleton className='h-4 w-32' />
									<Skeleton className='h-3 w-40' />
								</div>
							</div>
							<Skeleton className='h-5 w-16 rounded-full' />
						</div>
					))}
				</div>
			</div>
		);
	}

	if (!activeOrganization) {
		return (
			<div className='flex max-w-3xl flex-col gap-6'>
				<p className='text-sm text-muted-foreground'>{t("empty.noOrganization")}</p>
			</div>
		);
	}

	return (
		<div className='flex max-w-3xl flex-col gap-6'>
			<InviteMemberDialog
				isOpen={isInviteOpen}
				isSending={isSendingInvite}
				onOpenChange={setInviteOpen}
				onSend={handleSendInvite}
			/>

			<ManageMemberDialog
				entry={managedEntry}
				isOpen={isManageOpen}
				isProcessing={isProcessingManage}
				onOpenChange={handleManageOpenChange}
				onConfirm={handleConfirmManage}
			/>

			<div className='flex items-start justify-between gap-4'>
				<div className='flex flex-col gap-1'>
					<h2 className='text-lg font-semibold'>{t("title")}</h2>
					<p className='text-sm text-muted-foreground'>{t("description")}</p>
				</div>
				{canManageInvitations ? (
					<Button size='sm' onClick={openInviteDialog}>
						<PlusIcon className='size-4' />
						{t("invite.cta")}
					</Button>
				) : null}
			</div>

			<div className='overflow-hidden rounded-lg border border-border bg-card'>
				{entries.length === 0 ? (
					<div className='px-6 py-12 text-center text-sm text-muted-foreground'>{t("empty.noMembers")}</div>
				) : (
					<ul className='flex flex-col divide-y divide-border'>
						{entries.map((entry) => (
							<TeamMemberRow
								key={`${entry.type}:${entry.id}`}
								canManageInvitations={canManageInvitations}
								canManageMembers={canManageMembers}
								currentUserId={currentMemberId}
								entry={entry}
								onManage={handleOpenManage}
							/>
						))}
					</ul>
				)}
			</div>
		</div>
	);
};
