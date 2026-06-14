"use client";

import { useTranslations } from "next-intl";

import { Button } from "@webld/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@webld/ui/components/dialog";

import type { TeamRowEntry } from "./team-member-row";

export type ManageAction =
	| { type: "cancel-invitation"; invitationId: string }
	| { type: "remove-member"; memberId: string; displayName: string }
	| { type: "resend-invitation"; invitationId: string; email: string; role: string };

type ManageMemberDialogProps = {
	entry: TeamRowEntry | null;
	isProcessing: boolean;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: ({ action }: { action: ManageAction }) => Promise<void>;
};

export const ManageMemberDialog = ({
	entry,
	isProcessing,
	isOpen,
	onOpenChange,
	onConfirm,
}: ManageMemberDialogProps) => {
	const t = useTranslations("settings.team.manage");
	const tCommon = useTranslations("common");
	let variant: "invitation" | "member" | null = null;
	if (entry?.type === "invitation") {
		variant = "invitation";
	} else if (entry?.type === "member") {
		variant = "member";
	}

	const handleRemove = async () => {
		if (!entry) {
			return;
		}

		if (entry.type === "invitation") {
			await onConfirm({ action: { type: "cancel-invitation", invitationId: entry.id } });
		} else {
			await onConfirm({
				action: {
					type: "remove-member",
					memberId: entry.id,
					displayName: entry.user?.name || entry.user?.email || "",
				},
			});
		}
	};

	const handleResend = async () => {
		if (!entry || entry.type !== "invitation") {
			return;
		}

		await onConfirm({
			action: {
				type: "resend-invitation",
				invitationId: entry.id,
				email: entry.email,
				role: entry.role,
			},
		});
	};

	if (!entry || !variant) {
		return (
			<Dialog open={isOpen} onOpenChange={onOpenChange}>
				<DialogContent className='sm:max-w-md' />
			</Dialog>
		);
	}

	const displayLabel = entry.type === "invitation" ? entry.email : entry.user?.name || entry.user?.email;

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>{variant === "invitation" ? t("invitation.title") : t("member.title")}</DialogTitle>
					<DialogDescription>
						{variant === "invitation"
							? t("invitation.description", { email: displayLabel ?? "" })
							: t("member.description", { name: displayLabel ?? "" })}
					</DialogDescription>
				</DialogHeader>

				<DialogFooter className='flex-col gap-2 sm:flex-row sm:gap-2'>
					<Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={isProcessing}>
						{tCommon("cancel")}
					</Button>
					{variant === "invitation" ? (
						<>
							<Button
								type='button'
								variant='secondary'
								onClick={() => void handleResend()}
								loading={isProcessing}
								disabled={isProcessing}
							>
								{t("invitation.resend")}
							</Button>
							<Button
								type='button'
								variant='destructive'
								onClick={() => void handleRemove()}
								loading={isProcessing}
								disabled={isProcessing}
							>
								{t("invitation.cancel")}
							</Button>
						</>
					) : (
						<Button
							type='button'
							variant='destructive'
							onClick={() => void handleRemove()}
							loading={isProcessing}
							disabled={isProcessing}
						>
							{t("member.remove")}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
