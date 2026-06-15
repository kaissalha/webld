"use client";

import { useState } from "react";

import { useTranslations } from "next-intl";

import { Logo } from "@/components/logo";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Alert, AlertDescription, AlertTitle } from "@webld/ui/components/alert";
import { Badge } from "@webld/ui/components/badge";
import { Button } from "@webld/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@webld/ui/components/card";
import { toast } from "@webld/ui/components/sonner";

type AcceptInvitationClientProps = {
	invitationEmail?: string;
	invitationId: string;
	invitationOrganizationName?: string;
	invitationRole?: string;
	userEmail: string;
};

const formatRole = (role: string | undefined) => {
	if (!role) return "";
	return role
		.split(/[_\-\s]+/)
		.filter(Boolean)
		.map((segment) => `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}`)
		.join(" ");
};

export const AcceptInvitationClient = ({
	invitationEmail,
	invitationId,
	invitationOrganizationName,
	invitationRole,
	userEmail,
}: AcceptInvitationClientProps) => {
	const t = useTranslations("acceptInvitation");
	const tCommon = useTranslations("common");
	const router = useRouter();

	const [isAccepting, setIsAccepting] = useState(false);
	const [isRejecting, setIsRejecting] = useState(false);

	const emailMismatch = invitationEmail
		? invitationEmail.trim().toLowerCase() !== userEmail.trim().toLowerCase()
		: false;

	const handleAccept = async () => {
		setIsAccepting(true);
		const result = await authClient.organization.acceptInvitation({ invitationId });
		setIsAccepting(false);

		if (result?.error) {
			toast.error(t("errors.accept"));
			return;
		}

		const organizationId = result?.data?.invitation?.organizationId;

		if (organizationId) {
			await authClient.organization.setActive({ organizationId });
		}

		toast.success(t("success"));
		router.replace("/dashboard");
	};

	const handleReject = async () => {
		setIsRejecting(true);
		const result = await authClient.organization.rejectInvitation({ invitationId });
		setIsRejecting(false);

		if (result?.error) {
			toast.error(t("errors.reject"));
			return;
		}

		toast.success(t("rejected"));
		router.replace("/dashboard");
	};

	const handleSignOut = async () => {
		try {
			await authClient.signOut();
		} catch {}

		const target = typeof window !== "undefined" ? window.location.pathname : "/";
		router.replace(`/login?redirect_url=${encodeURIComponent(target)}`);
	};

	const hasInvitationDetails = Boolean(invitationOrganizationName || invitationEmail || invitationRole);

	return (
		<main className='flex min-h-screen items-center justify-center bg-background px-6 py-12'>
			<div className='w-full max-w-md space-y-8'>
				<Link href='/' className='flex items-center justify-center gap-3'>
					<Logo className='size-10' />
				</Link>

				<Card className='border-border/70 bg-background/95 shadow-[0_20px_50px_-28px_color-mix(in_oklch,var(--color-foreground)_12%,transparent)]'>
					<CardHeader className='space-y-3 text-center'>
						<Badge
							variant='outline'
							size='sm'
							className='mx-auto rounded-full px-3 py-1 text-xs uppercase tracking-widest'
						>
							{t("eyebrow")}
						</Badge>
						<CardTitle className='text-2xl tracking-tight'>
							{invitationOrganizationName
								? t("titleWithOrganization", { organizationName: invitationOrganizationName })
								: t("title")}
						</CardTitle>
						{hasInvitationDetails ? (
							<p className='text-sm text-muted-foreground'>
								{t("description", {
									email: invitationEmail ?? userEmail,
									role: formatRole(invitationRole) || t("defaultRole"),
								})}
							</p>
						) : (
							<p className='text-sm text-muted-foreground'>{t("descriptionFallback")}</p>
						)}
					</CardHeader>
					<CardContent className='space-y-4'>
						{emailMismatch ? (
							<Alert variant='warning'>
								<AlertTitle>{t("mismatch.title")}</AlertTitle>
								<AlertDescription>
									{t("mismatch.description", {
										invitationEmail: invitationEmail ?? "",
										userEmail,
									})}
								</AlertDescription>
							</Alert>
						) : null}

						<div className='flex flex-col gap-2'>
							<Button
								size='xl'
								className='w-full'
								onClick={() => void handleAccept()}
								loading={isAccepting}
								disabled={isAccepting || isRejecting}
							>
								{t("accept")}
							</Button>
							<Button
								variant='outline'
								size='xl'
								className='w-full'
								onClick={() => void handleReject()}
								loading={isRejecting}
								disabled={isAccepting || isRejecting}
							>
								{t("decline")}
							</Button>
							{emailMismatch ? (
								<Button
									variant='ghost'
									size='sm'
									className='w-full'
									onClick={() => void handleSignOut()}
								>
									{t("signInAsOther")}
								</Button>
							) : null}
						</div>

						<p className='text-center text-xs text-muted-foreground'>
							{t("signedInAs", { email: userEmail })} ·{" "}
							<Link href='/dashboard' className='underline underline-offset-2'>
								{tCommon("back")}
							</Link>
						</p>
					</CardContent>
				</Card>
			</div>
		</main>
	);
};
