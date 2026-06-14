"use client";

import { format } from "date-fns";
import { useTranslations } from "next-intl";

import { Badge } from "@webld/ui/components/badge";
import { Button } from "@webld/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@webld/ui/components/card";

import type { OnboardingInvitation } from "./use-onboarding-controller";

const formatInvitationRole = ({ role }: { role: string }) => {
	return role
		.split(/[_-\s]+/)
		.filter(Boolean)
		.map((segment) => `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}`)
		.join(" ");
};

const formatInvitationDate = ({ value }: { value: Date | string }) => {
	const date = value instanceof Date ? value : new Date(value);

	if (Number.isNaN(date.getTime())) {
		return "";
	}

	return format(date, "MMM d, yyyy");
};

type InvitationListProps = {
	invitations: OnboardingInvitation[];
	isAcceptingInvitation: boolean;
	onAcceptInvitation: ({ invitationId }: { invitationId: string }) => Promise<void>;
	pendingInvitationId: string | null;
};

export const InvitationList = ({
	invitations,
	isAcceptingInvitation,
	onAcceptInvitation,
	pendingInvitationId,
}: InvitationListProps) => {
	const t = useTranslations("onboarding");

	return (
		<div className='space-y-4'>
			{invitations.map((invitation) => {
				const isPendingCurrentInvitation = isAcceptingInvitation && pendingInvitationId === invitation.id;
				const organizationName = invitation.organizationName || invitation.organizationId;
				const expiresAt = formatInvitationDate({ value: invitation.expiresAt });

				return (
					<Card
						key={invitation.id}
						className='border-border/70 bg-background/90 shadow-[0_20px_50px_-28px_color-mix(in_oklch,var(--color-foreground)_12%,transparent)]'
					>
						<CardHeader className='gap-3'>
							<div className='flex flex-wrap items-center gap-3'>
								<Badge variant='dark' size='sm'>
									{formatInvitationRole({ role: invitation.role })}
								</Badge>
								{expiresAt ? (
									<span className='text-xs text-muted-foreground'>
										{t("inviteExpires", { date: expiresAt })}
									</span>
								) : null}
							</div>
							<CardTitle className='text-xl tracking-tight'>{organizationName}</CardTitle>
						</CardHeader>
						<CardContent>
							<Button
								size='xl'
								className='w-full'
								disabled={isAcceptingInvitation}
								onClick={() => void onAcceptInvitation({ invitationId: invitation.id })}
							>
								{isPendingCurrentInvitation ? t("inviteActionPending") : t("inviteAction")}
							</Button>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
};
