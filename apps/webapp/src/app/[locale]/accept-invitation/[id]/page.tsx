import { headers } from "next/headers";

import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { auth } from "@webld/server/auth";

import { AcceptInvitationClient } from "./accept-invitation-client";

type AcceptInvitationPageProps = {
	params: Promise<{ id: string }>;
};

export default async function AcceptInvitationPage({ params }: AcceptInvitationPageProps) {
	const [{ id }, headersList, locale] = await Promise.all([params, headers(), getLocale()]);
	const session = await auth.api.getSession({
		headers: headersList,
	});

	if (!session) {
		const redirectTarget = `/${locale}/accept-invitation/${id}`;
		redirect({
			href: `/login?redirect_url=${encodeURIComponent(redirectTarget)}`,
			locale,
		});
		return null;
	}

	let invitationEmail: string | undefined;
	let invitationOrganizationName: string | undefined;
	let invitationRole: string | undefined;

	try {
		const invitation = await auth.api.getInvitation({
			query: { id },
			headers: headersList,
		});
		invitationEmail = invitation?.email;
		invitationOrganizationName = invitation?.organizationName;
		invitationRole = invitation?.role;
	} catch {
		// Surface the error on the client so the user can retry or sign in with the correct account.
	}

	return (
		<AcceptInvitationClient
			invitationId={id}
			invitationEmail={invitationEmail}
			invitationOrganizationName={invitationOrganizationName}
			invitationRole={invitationRole}
			userEmail={session.user.email}
		/>
	);
}
