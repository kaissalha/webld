"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";

import { authClient } from "@/lib/auth-client";
import { Button } from "@webld/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@webld/ui/components/dialog";
import { Input } from "@webld/ui/components/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@webld/ui/components/input-otp";
import { Label } from "@webld/ui/components/label";
import { Skeleton } from "@webld/ui/components/skeleton";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@webld/ui/components/tooltip";

import { SettingsCard } from "./settings-card";
import { useTwoFactorDialog } from "./use-two-factor-dialog";

export const SecurityTab = () => {
	const t = useTranslations("settings");
	const tCommon = useTranslations("common");
	const { data: session, refetch } = authClient.useSession();
	const user = session?.user;

	const { data: accounts } = useQuery({
		queryKey: ["accounts", user?.id],
		queryFn: async () => {
			const { data } = await authClient.listAccounts();
			return data ?? [];
		},
		enabled: !!user?.id,
	});

	const hasCredentialAccount = accounts?.some((account) => account.providerId === "credential");
	const {
		canDisable,
		canVerify,
		closeDialog,
		disableTwoFactor,
		enableTwoFactor,
		goToScanStep,
		goToVerifyStep,
		handleOpenChange,
		setPassword,
		setVerificationCode,
		startDisable,
		startSetup,
		verifyTotp,
		state: { backupCodes, dialogMode, isLoading, isSetupOpen, password, setupStep, totpUri, verificationCode },
	} = useTwoFactorDialog({ refetch });

	if (!user) {
		return (
			<div className='flex max-w-3xl flex-col gap-6'>
				<div className='rounded-lg border border-border bg-card'>
					<div className='flex flex-col gap-2 p-6'>
						<Skeleton className='h-5 w-48' />
						<Skeleton className='h-4 w-72' />
					</div>
					<div className='flex items-center justify-between gap-4 border-t border-border bg-muted/30 px-6 py-4'>
						<div />
						<Skeleton className='h-8 w-24' />
					</div>
				</div>
			</div>
		);
	}

	const isTwoFactorEnabled = user.twoFactorEnabled;

	return (
		<div className='flex max-w-3xl flex-col gap-6'>
			<SettingsCard
				title={t("security.mfa.title")}
				description={t("security.mfa.description")}
				footer={
					hasCredentialAccount ? (
						<Button size='sm' onClick={startSetup}>
							{t("security.mfa.addDevice")}
						</Button>
					) : (
						<Tooltip>
							<TooltipTrigger
								render={
									<span className='inline-block'>
										<Button size='sm' disabled className='pointer-events-none'>
											{t("security.mfa.addDevice")}
										</Button>
									</span>
								}
								delay={0}
							/>
							<TooltipPopup>{t("security.mfa.socialAccountNotice")}</TooltipPopup>
						</Tooltip>
					)
				}
			>
				{isTwoFactorEnabled ? (
					<div className='flex items-center justify-between rounded-lg border border-border p-4'>
						<div className='flex flex-col gap-1'>
							<p className='text-sm font-medium'>
								{t("security.mfa.addedOn", {
									date: new Date().toLocaleString(),
								})}
							</p>
							<p className='text-xs text-muted-foreground'>{t("security.mfa.verified")}</p>
						</div>
						<Button variant='outline' size='sm' onClick={startDisable}>
							{t("security.mfa.remove")}
						</Button>
					</div>
				) : null}
			</SettingsCard>

			<Dialog open={isSetupOpen} onOpenChange={handleOpenChange}>
				<DialogContent className='sm:max-w-md'>
					{dialogMode === "disable" && (
						<>
							<DialogHeader>
								<DialogTitle>{t("security.mfa.disable.title")}</DialogTitle>
								<DialogDescription>{t("security.mfa.disable.description")}</DialogDescription>
							</DialogHeader>
							<div className='grid gap-4 py-4'>
								<div className='grid gap-2'>
									<Label htmlFor='disable-password'>{t("security.mfa.setup.passwordLabel")}</Label>
									<Input
										id='disable-password'
										type='password'
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										placeholder={t("security.mfa.setup.passwordPlaceholder")}
									/>
								</div>
							</div>
							<DialogFooter>
								<Button variant='outline' onClick={closeDialog}>
									{tCommon("cancel")}
								</Button>
								<Button
									variant='destructive'
									onClick={disableTwoFactor}
									loading={isLoading}
									disabled={!canDisable}
								>
									{t("security.mfa.remove")}
								</Button>
							</DialogFooter>
						</>
					)}

					{dialogMode === "enable" && setupStep === "password" && (
						<>
							<DialogHeader>
								<DialogTitle>{t("security.mfa.setup.passwordTitle")}</DialogTitle>
								<DialogDescription>{t("security.mfa.setup.passwordDescription")}</DialogDescription>
							</DialogHeader>
							<div className='grid gap-4 py-4'>
								<div className='grid gap-2'>
									<Label htmlFor='password'>{t("security.mfa.setup.passwordLabel")}</Label>
									<Input
										id='password'
										type='password'
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										placeholder={t("security.mfa.setup.passwordPlaceholder")}
									/>
								</div>
							</div>
							<DialogFooter>
								<Button variant='outline' onClick={closeDialog}>
									{tCommon("cancel")}
								</Button>
								<Button onClick={enableTwoFactor} loading={isLoading} disabled={!canDisable}>
									{tCommon("next")}
								</Button>
							</DialogFooter>
						</>
					)}

					{dialogMode === "enable" && setupStep === "scan" && (
						<>
							<DialogHeader>
								<DialogTitle>{t("security.mfa.setup.scanTitle")}</DialogTitle>
								<DialogDescription>{t("security.mfa.setup.scanDescription")}</DialogDescription>
							</DialogHeader>
							<div className='flex flex-col items-center gap-6 py-4'>
								<div className='rounded-lg bg-popover p-4'>
									<QRCode value={totpUri} size={200} />
								</div>
								{backupCodes.length > 0 && (
									<div className='w-full'>
										<p className='mb-2 text-sm font-medium'>
											{t("security.mfa.setup.backupCodesTitle")}
										</p>
										<p className='mb-2 text-xs text-muted-foreground'>
											{t("security.mfa.setup.backupCodesDescription")}
										</p>
										<div className='grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/50 p-3'>
											{backupCodes.map((code) => (
												<code key={code} className='font-mono text-xs'>
													{code}
												</code>
											))}
										</div>
									</div>
								)}
							</div>
							<DialogFooter>
								<Button variant='outline' onClick={closeDialog}>
									{tCommon("cancel")}
								</Button>
								<Button onClick={goToVerifyStep}>{tCommon("next")}</Button>
							</DialogFooter>
						</>
					)}

					{dialogMode === "enable" && setupStep === "verify" && (
						<>
							<DialogHeader>
								<DialogTitle>{t("security.mfa.setup.verifyTitle")}</DialogTitle>
								<DialogDescription>{t("security.mfa.setup.verifyDescription")}</DialogDescription>
							</DialogHeader>
							<div className='flex flex-col items-center gap-4 py-4'>
								<InputOTP maxLength={6} value={verificationCode} onChange={setVerificationCode}>
									<InputOTPGroup>
										<InputOTPSlot index={0} />
										<InputOTPSlot index={1} />
										<InputOTPSlot index={2} />
										<InputOTPSlot index={3} />
										<InputOTPSlot index={4} />
										<InputOTPSlot index={5} />
									</InputOTPGroup>
								</InputOTP>
							</div>
							<DialogFooter>
								<Button variant='outline' onClick={goToScanStep}>
									{tCommon("actions.back")}
								</Button>
								<Button onClick={verifyTotp} loading={isLoading} disabled={!canVerify}>
									{t("security.mfa.setup.verify")}
								</Button>
							</DialogFooter>
						</>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
};
