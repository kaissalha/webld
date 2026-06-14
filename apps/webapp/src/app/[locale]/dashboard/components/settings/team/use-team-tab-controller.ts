"use client";

import { useMemo, useState } from "react";

import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { resolveAuthClientResult } from "@/lib/auth-client-request";
import { toast } from "@webld/ui/components/sonner";

import type { ManageAction } from "./manage-member-dialog";
import type { TeamInvitationData, TeamMemberData, TeamRowEntry } from "./team-member-row";

type InviteRole = "member" | "admin";

const toInvitationDate = ({ value }: { value: Date | string | null | undefined }) => {
	if (!value) {
		return new Date(0);
	}

	return value instanceof Date ? value : new Date(value);
};

export const useTeamTabController = () => {
	const t = useTranslations("settings.team");
	const tCommon = useTranslations("common");

	const {
		data: activeOrganization,
		isPending: isOrgPending,
		refetch: refetchOrg,
	} = authClient.useActiveOrganization();
	const { data: activeMember, isPending: isMemberPending } = authClient.useActiveMember();

	const [isInviteOpen, setIsInviteOpen] = useState(false);
	const [isSendingInvite, setIsSendingInvite] = useState(false);
	const [isManageOpen, setIsManageOpen] = useState(false);
	const [managedEntry, setManagedEntry] = useState<TeamRowEntry | null>(null);
	const [isProcessingManage, setIsProcessingManage] = useState(false);

	const activeRole = activeMember?.role;
	const canManageMembers =
		activeRole === "admin" || activeRole === "member" || activeRole === "owner"
			? authClient.organization.checkRolePermission({
					permissions: { member: ["delete"] },
					role: activeRole,
				})
			: false;
	const canManageInvitations =
		activeRole === "admin" || activeRole === "member" || activeRole === "owner"
			? authClient.organization.checkRolePermission({
					permissions: { invitation: ["create", "cancel"] },
					role: activeRole,
				})
			: false;

	const entries = useMemo<TeamRowEntry[]>(() => {
		if (!activeOrganization) {
			return [];
		}

		const members: TeamMemberData[] = (activeOrganization.members ?? []).map((member) => ({
			id: member.id,
			role: member.role,
			type: "member",
			user: {
				email: member.user.email,
				image: member.user.image ?? null,
				name: member.user.name,
			},
		}));
		const rolePriority: Record<string, number> = {
			owner: 0,
			admin: 1,
			member: 2,
		};
		members.sort((left, right) => {
			const leftPriority = rolePriority[left.role] ?? 99;
			const rightPriority = rolePriority[right.role] ?? 99;
			if (leftPriority !== rightPriority) {
				return leftPriority - rightPriority;
			}

			return left.user.name.localeCompare(right.user.name);
		});

		const pendingInvitations: TeamInvitationData[] = (activeOrganization.invitations ?? [])
			.filter((invitation) => invitation.status === "pending")
			.map(
				(invitation): TeamInvitationData => ({
					email: invitation.email,
					expiresAt: invitation.expiresAt,
					id: invitation.id,
					role: invitation.role ?? "member",
					status: invitation.status,
					type: "invitation",
				})
			)
			.sort(
				(left, right) =>
					toInvitationDate({ value: right.expiresAt }).getTime() -
					toInvitationDate({ value: left.expiresAt }).getTime()
			);

		return [...members, ...pendingInvitations];
	}, [activeOrganization]);

	const handleOpenManage = ({ entry }: { entry: TeamRowEntry }) => {
		setManagedEntry(entry);
		setIsManageOpen(true);
	};

	const handleManageOpenChange = (open: boolean) => {
		setIsManageOpen(open);
		if (!open) {
			setManagedEntry(null);
		}
	};

	const handleSendInvite = async ({ email, role }: { email: string; role: InviteRole }) => {
		setIsSendingInvite(true);
		const result = await resolveAuthClientResult({
			request: () => authClient.organization.inviteMember({ email, role }),
			fallbackMessage: t("errors.invite"),
		});
		setIsSendingInvite(false);

		if (result.error) {
			const message = result.error.message ?? t("errors.invite");
			toast.error(message);
			return { error: message };
		}

		toast.success(t("invite.success", { email }));
		setIsInviteOpen(false);
		await refetchOrg();
		return { error: null };
	};

	const handleConfirmManage = async ({ action }: { action: ManageAction }) => {
		setIsProcessingManage(true);

		try {
			if (action.type === "cancel-invitation") {
				const result = await resolveAuthClientResult({
					request: () => authClient.organization.cancelInvitation({ invitationId: action.invitationId }),
					fallbackMessage: t("errors.cancelInvitation"),
				});
				if (result.error) {
					toast.error(result.error.message ?? t("errors.cancelInvitation"));
					return;
				}

				toast.success(t("manage.invitation.success"));
			} else if (action.type === "resend-invitation") {
				const role = action.role === "admin" || action.role === "owner" ? action.role : "member";
				const result = await resolveAuthClientResult({
					request: () => authClient.organization.inviteMember({ email: action.email, role, resend: true }),
					fallbackMessage: t("errors.resend"),
				});
				if (result.error) {
					toast.error(result.error.message ?? t("errors.resend"));
					return;
				}

				toast.success(t("manage.invitation.resent", { email: action.email }));
			} else {
				const result = await resolveAuthClientResult({
					request: () => authClient.organization.removeMember({ memberIdOrEmail: action.memberId }),
					fallbackMessage: t("errors.remove"),
				});
				if (result.error) {
					toast.error(result.error.message ?? t("errors.remove"));
					return;
				}

				toast.success(
					t("manage.member.success", {
						name: action.displayName || tCommon("save"),
					})
				);
			}

			await refetchOrg();
			setIsManageOpen(false);
			setManagedEntry(null);
		} finally {
			setIsProcessingManage(false);
		}
	};

	return {
		activeOrganization,
		canManageInvitations,
		canManageMembers,
		currentMemberId: activeMember?.id,
		entries,
		handleConfirmManage,
		handleManageOpenChange,
		handleOpenManage,
		handleSendInvite,
		isInviteOpen,
		isLoading: isOrgPending || isMemberPending,
		isManageOpen,
		isProcessingManage,
		isSendingInvite,
		managedEntry,
		openInviteDialog: () => {
			setIsInviteOpen(true);
		},
		setInviteOpen: setIsInviteOpen,
	};
};
