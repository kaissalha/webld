"use client";

import { MoreVerticalIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@starter/ui/components/avatar";
import { Badge } from "@starter/ui/components/badge";
import { Button } from "@starter/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@starter/ui/components/dropdown-menu";

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

const getInitials = ({ name, email }: { email: string; name: string }) => {
	const source = name?.trim() || email;
	if (!source) return "?";
	const parts = source.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
	}
	return source.slice(0, 2).toUpperCase();
};

const getRoleBadgeVariant = (role: string) => {
	let variant: "dark" | "secondary" | "outline" = "outline";

	switch (role) {
		case "owner":
			variant = "dark";
			break;
		case "admin":
			variant = "secondary";
			break;
	}

	return variant;
};

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
	let roleLabel = t("roles.member");
	if (!isInvitation) {
		if (entry.role === "owner") {
			roleLabel = t("roles.owner");
		} else if (entry.role === "admin") {
			roleLabel = t("roles.admin");
		}
	}

	return (
		<li className='flex items-center justify-between gap-3 px-6 py-3'>
			<div className='flex min-w-0 items-center gap-3'>
				<Avatar className='size-9'>
					{imageUrl ? <AvatarImage src={imageUrl} alt={displayName} /> : null}
					<AvatarFallback>{getInitials({ name: displayName, email: displayEmail })}</AvatarFallback>
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
					<Badge variant={getRoleBadgeVariant(entry.role)} size='sm'>
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
