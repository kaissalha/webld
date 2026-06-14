"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";

import { Button } from "@starter/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@starter/ui/components/dialog";
import { Input } from "@starter/ui/components/input";
import { Label } from "@starter/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@starter/ui/components/select";

type InviteRole = "member" | "admin";

type InviteMemberDialogProps = {
	isOpen: boolean;
	isSending: boolean;
	onOpenChange: (open: boolean) => void;
	onSend: ({ email, role }: { email: string; role: InviteRole }) => Promise<{ error?: string | null } | null | void>;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InviteMemberDialogFormProps = {
	isSending: boolean;
	onOpenChange: (open: boolean) => void;
	onSend: ({ email, role }: { email: string; role: InviteRole }) => Promise<{ error?: string | null } | null | void>;
};

const InviteMemberDialogForm = ({ isSending, onOpenChange, onSend }: InviteMemberDialogFormProps) => {
	const t = useTranslations("settings.team.invite");
	const tCommon = useTranslations("common");
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<InviteRole>("member");
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);

		const trimmed = email.trim();
		if (!trimmed) {
			setError(t("errors.required"));
			return;
		}

		if (!EMAIL_PATTERN.test(trimmed)) {
			setError(t("errors.invalidEmail"));
			return;
		}

		const result = await onSend({ email: trimmed, role });
		if (result?.error) {
			setError(result.error);
		}
	};

	return (
		<form onSubmit={handleSubmit} className='space-y-4'>
			<div className='space-y-2'>
				<Label htmlFor='invite-email'>{t("fields.email.label")}</Label>
				<Input
					id='invite-email'
					type='email'
					autoComplete='email'
					placeholder={t("fields.email.placeholder")}
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					disabled={isSending}
				/>
			</div>

			<div className='space-y-2'>
				<Label htmlFor='invite-role'>{t("fields.role.label")}</Label>
				<Select
					value={role}
					onValueChange={(value) => {
						if (value === "admin" || value === "member") {
							setRole(value);
						}
					}}
					disabled={isSending}
				>
					<SelectTrigger id='invite-role'>
						<SelectValue placeholder={t("fields.role.placeholder")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='member'>{t("fields.role.options.member")}</SelectItem>
						<SelectItem value='admin'>{t("fields.role.options.admin")}</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{error ? <p className='text-sm text-destructive'>{error}</p> : null}

			<DialogFooter>
				<Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={isSending}>
					{tCommon("cancel")}
				</Button>
				<Button type='submit' loading={isSending} disabled={isSending}>
					{t("submit")}
				</Button>
			</DialogFooter>
		</form>
	);
};

export const InviteMemberDialog = ({ isOpen, isSending, onOpenChange, onSend }: InviteMemberDialogProps) => {
	const t = useTranslations("settings.team.invite");

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>{t("title")}</DialogTitle>
					<DialogDescription>{t("description")}</DialogDescription>
				</DialogHeader>
				<InviteMemberDialogForm
					key={isOpen ? "invite-member-open" : "invite-member-closed"}
					isSending={isSending}
					onOpenChange={onOpenChange}
					onSend={onSend}
				/>
			</DialogContent>
		</Dialog>
	);
};
