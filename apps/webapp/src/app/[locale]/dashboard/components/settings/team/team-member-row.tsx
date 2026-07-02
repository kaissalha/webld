"use client";

import { MoreVerticalIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@webld/ui/components/avatar";
import { Badge } from "@webld/ui/components/badge";
import { Button } from "@webld/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@webld/ui/components/dropdown-menu";
import { user } from "@webld/utils";

export type TeamMemberData = {
	id: string;
	role: string;
	type: "member";
	user: {
		email: string;
		image?: string | null;
		name: string;
	};
};

export type TeamInvitationData = {
	email: string;
	expiresAt: Date | string;
	id: string;
	role: string;
	status: string;
	type: "invitation";
};

export type TeamRowEntry = TeamInvitationData | TeamMemberData;

type TeamMemberRowProps = {
	canManageMembers: boolean;
	canManageInvitations: boolean;
	currentUserId?: string | null;
	entry: TeamRowEntry;
	onManage: ({ entry }: { entry: TeamRowEntry }) => void;
};

const ROLE_BADGE_VARIANTS = {
	owner: "dark",
	admin: "secondary",
} as const;

export const TeamMemberRow = ({
	canManageMembers,
	canManageInvitations,
	currentUserId,
	entry,
	onManage,
}: TeamMemberRowProps) => {
	const t = useTranslations("settings.team");

	const isInvitation = entry.type === "invitation";
	const isCurrentUser = !isInvitation && entry.user && currentUserId === entry.id;

	const displayName = isInvitation ? entry.email : entry.user.name || entry.user.email;
	const displayEmail = isInvitation ? entry.email : entry.user.email;
	const imageUrl = !isInvitation ? (entry.user.image ?? undefined) : undefined;
	const canShowMenu = isInvitation
		? canManageInvitations
		: entry.role !== "owner" && !isCurrentUser && canManageMembers;
	const roleLabel = isInvitation
		? t("roles.member")
		: entry.role === "owner"
			? t("roles.owner")
			: entry.role === "admin"
				? t("roles.admin")
				: t("roles.member");
	const roleBadgeVariant = ROLE_BADGE_VARIANTS[entry.role as keyof typeof ROLE_BADGE_VARIANTS] ?? "outline";

	return (
		<li className='flex items-center justify-between gap-3 px-6 py-3'>
			<div className='flex min-w-0 items-center gap-3'>
				<Avatar className='size-9'>
					{imageUrl ? <AvatarImage src={imageUrl} alt={displayName} /> : null}
					<AvatarFallback>
						{user.getPersonInitials({ name: displayName, email: displayEmail })}
					</AvatarFallback>
				</Avatar>
				<div className='flex min-w-0 flex-col'>
					<div className='flex items-center gap-2'>
						<span className='truncate text-sm font-medium text-foreground'>{displayName}</span>
						{isCurrentUser ? (
							<span className='text-xs text-muted-foreground'>{t("labels.you")}</span>
						) : null}
					</div>
					<span className='truncate text-xs text-muted-foreground'>{displayEmail}</span>
				</div>
			</div>

			<div className='flex shrink-0 items-center gap-2'>
				{isInvitation ? (
					<Badge variant='warning' size='sm'>
						{t("status.pending")}
					</Badge>
				) : (
					<Badge variant={roleBadgeVariant} size='sm'>
						{roleLabel}
					</Badge>
				)}

				{canShowMenu ? (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant='ghost' size='icon' aria-label={t("actions.more")}>
								<MoreVerticalIcon className='size-4' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align='end'>
							{isInvitation ? (
								<>
									<DropdownMenuItem onClick={() => onManage({ entry })}>
										{t("actions.resend")}
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => onManage({ entry })}
										className='text-destructive focus:text-destructive'
									>
										{t("actions.cancelInvitation")}
									</DropdownMenuItem>
								</>
							) : (
								<DropdownMenuItem
									onClick={() => onManage({ entry })}
									className='text-destructive focus:text-destructive'
								>
									{t("actions.remove")}
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}
			</div>
		</li>
	);
};
