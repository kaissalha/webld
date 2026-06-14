"use client";

import { useCallback, useState } from "react";

import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@webld/ui/components/avatar";
import { Button } from "@webld/ui/components/button";
import { Input } from "@webld/ui/components/input";
import { Skeleton } from "@webld/ui/components/skeleton";
import { toast } from "@webld/ui/components/sonner";

import { SettingsCard } from "./settings-card";

export const ProfileTab = () => {
	const t = useTranslations("settings");
	const tCommon = useTranslations("common");
	const { data: session } = authClient.useSession();
	const user = session?.user;

	const [name, setName] = useState(user?.name ?? "");
	const [isUpdatingName, setIsUpdatingName] = useState(false);

	const userInitials = user?.name
		?.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase();

	const handleUpdateName = useCallback(async () => {
		if (!name.trim()) return;

		setIsUpdatingName(true);
		try {
			await authClient.updateUser({
				name: name.trim(),
			});
			toast.success(tCommon("saved"));
		} catch {
			toast.error(tCommon("saveError"));
		} finally {
			setIsUpdatingName(false);
		}
	}, [name, tCommon]);

	if (!user) {
		return (
			<div className='flex max-w-3xl flex-col gap-6'>
				<div className='rounded-lg border border-border bg-card'>
					<div className='flex items-start justify-between gap-4 p-6'>
						<div className='flex flex-col gap-2'>
							<Skeleton className='h-5 w-24' />
							<Skeleton className='h-4 w-48' />
						</div>
						<Skeleton className='h-16 w-16 rounded-full' />
					</div>
					<div className='flex items-center justify-between gap-4 border-t border-border bg-muted/30 px-6 py-4'>
						<Skeleton className='h-3 w-32' />
					</div>
				</div>

				<div className='rounded-lg border border-border bg-card'>
					<div className='flex flex-col gap-2 p-6'>
						<Skeleton className='h-5 w-28' />
						<Skeleton className='h-4 w-56' />
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
						<Skeleton className='h-5 w-16' />
						<Skeleton className='h-4 w-44' />
					</div>
					<div className='px-6 pb-6'>
						<Skeleton className='h-9 w-full max-w-xs' />
					</div>
					<div className='flex items-center justify-between gap-4 border-t border-border bg-muted/30 px-6 py-4'>
						<Skeleton className='h-3 w-40' />
						<Skeleton className='h-8 w-16' />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='flex max-w-3xl flex-col gap-6'>
			<SettingsCard
				title={t("profile.avatar.title")}
				description={t("profile.avatar.description")}
				action={
					<Avatar className='h-16 w-16 cursor-pointer transition-opacity hover:opacity-80'>
						<AvatarImage src={user.image ?? ""} alt={user.name} />
						<AvatarFallback className='text-lg'>{userInitials}</AvatarFallback>
					</Avatar>
				}
				footerHint={t("profile.avatar.hint")}
			/>

			<SettingsCard
				title={t("profile.displayName.title")}
				description={t("profile.displayName.description")}
				footer={
					<Button
						onClick={handleUpdateName}
						loading={isUpdatingName}
						disabled={name === user.name || !name.trim()}
						size='sm'
					>
						{tCommon("save")}
					</Button>
				}
				footerHint={t("profile.displayName.hint")}
			>
				<Input
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder={t("profile.fields.namePlaceholder")}
					className='max-w-xs'
				/>
			</SettingsCard>

			<SettingsCard
				title={t("profile.email.title")}
				description={t("profile.email.description")}
				footer={
					<Button size='sm' disabled>
						{tCommon("save")}
					</Button>
				}
				footerHint={t("profile.email.hint")}
			>
				<Input type='email' value={user.email} disabled className='max-w-xs opacity-60' />
			</SettingsCard>
		</div>
	);
};
