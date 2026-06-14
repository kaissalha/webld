"use client";

import { useEffect } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { requireAuthClientData, resolveAuthClientResult } from "@/lib/auth-client-request";
import { uploadFromClient } from "@/lib/storage";
import { toast } from "@webld/ui/components/sonner";

import { buildOrganizationSlug } from "./onboarding-utils";

type OrganizationSummary = {
	id: string;
	name: string;
};

export type OnboardingInvitation = {
	createdAt: Date | string;
	email: string;
	expiresAt: Date | string;
	id: string;
	organizationId: string;
	organizationName?: string;
	role: string;
	status: string;
};

const getLogoFileExtension = ({ file }: { file: File }) => {
	const extensionFromName = file.name.split(".").pop()?.toLowerCase();
	if (extensionFromName) {
		return extensionFromName;
	}

	return file.type.split("/")[1]?.split("+")[0]?.toLowerCase() || "bin";
};

const uploadOrganizationLogo = async ({
	logoFile,
	organizationId,
	uploadErrorMessage,
}: {
	logoFile: File;
	organizationId: string;
	uploadErrorMessage: string;
}) => {
	try {
		await requireAuthClientData({
			request: () => authClient.organization.setActive({ organizationId }),
			fallbackMessage: uploadErrorMessage,
		});

		const pathname = `organizations/${organizationId}/logo-${Date.now()}.${getLogoFileExtension({
			file: logoFile,
		})}`;
		const blob = await uploadFromClient({
			pathname,
			file: logoFile,
			handleUploadUrl: "/api/media",
			payload: {
				organizationId,
				access: "public",
				maxFileSizeMb: 4,
			},
		});

		await requireAuthClientData({
			request: () =>
				authClient.organization.update({
					data: { logo: blob.url },
					organizationId,
				}),
			fallbackMessage: uploadErrorMessage,
		});
	} catch {
		toast.error(uploadErrorMessage);
	}
};

export const useOnboardingController = ({ redirectPath }: { redirectPath: string }) => {
	const t = useTranslations("onboarding");
	const router = useRouter();
	const { data: activeOrganization, isPending: isActiveOrganizationPending } = authClient.useActiveOrganization();
	const { data: listedOrganizations, isPending: isOrganizationsPending } = authClient.useListOrganizations();
	const organizations: OrganizationSummary[] | null = listedOrganizations ?? null;

	const {
		data: invitationsData,
		error: invitationsError,
		isPending: isInvitationsPending,
		refetch: refetchInvitations,
	} = useQuery({
		queryKey: ["onboarding", "user-invitations"],
		enabled: !isOrganizationsPending && (organizations?.length ?? 0) === 0,
		queryFn: async () => {
			const data = await requireAuthClientData<OnboardingInvitation[]>({
				request: () => authClient.organization.listUserInvitations(),
				fallbackMessage: t("errors.loadInvitations"),
			});

			return data ?? [];
		},
		staleTime: 30_000,
	});

	const {
		isPending: isAcceptingInvitation,
		mutateAsync: acceptInvitation,
		variables: acceptInvitationVariables,
	} = useMutation({
		mutationFn: ({ invitationId }: { invitationId: string }) =>
			requireAuthClientData({
				request: () => authClient.organization.acceptInvitation({ invitationId }),
				fallbackMessage: t("errors.acceptInvitation"),
			}),
		onSuccess: () => {
			router.replace(redirectPath);
		},
		onError: () => {
			toast.error(t("errors.acceptInvitation"));
		},
	});

	const { isPending: isCreatingOrganization, mutateAsync: createOrganization } = useMutation({
		mutationFn: async ({ name, logoFile }: { name: string; logoFile?: File | null }) => {
			const normalizedName = name.trim();
			let result = await resolveAuthClientResult<OrganizationSummary>({
				request: () =>
					authClient.organization.create({
						name: normalizedName,
						slug: buildOrganizationSlug({ name: normalizedName }),
					}),
				fallbackMessage: t("errors.createOrganization"),
			});

			if (result.error?.code === "ORGANIZATION_SLUG_ALREADY_TAKEN") {
				result = await resolveAuthClientResult<OrganizationSummary>({
					request: () =>
						authClient.organization.create({
							name: normalizedName,
							slug: buildOrganizationSlug({
								name: normalizedName,
								suffix: Date.now().toString(36).slice(-6),
							}),
						}),
					fallbackMessage: t("errors.createOrganization"),
				});
			}

			if (result.error || !result.data) {
				throw new Error(result.error?.message ?? t("errors.createOrganization"));
			}

			if (logoFile) {
				await uploadOrganizationLogo({
					logoFile,
					organizationId: result.data.id,
					uploadErrorMessage: t("errors.uploadLogo"),
				});
			}

			return result.data;
		},
		onSuccess: () => {
			router.replace(redirectPath);
		},
	});

	const {
		isError: hasRestoreError,
		isPending: isRestoringOrganization,
		mutate: startRestoreOrganization,
		mutateAsync: restoreOrganization,
		status: restoreStatus,
	} = useMutation({
		mutationFn: ({ organizationId }: { organizationId: string }) =>
			requireAuthClientData({
				request: () => authClient.organization.setActive({ organizationId }),
				fallbackMessage: t("errors.restoreOrganization"),
			}),
		onSuccess: () => {
			router.replace(redirectPath);
		},
		onError: () => {
			toast.error(t("errors.restoreOrganization"));
		},
	});

	useEffect(() => {
		if (activeOrganization) {
			router.replace(redirectPath);
			return;
		}

		const firstOrganization = organizations?.[0];
		if (!firstOrganization || restoreStatus !== "idle") {
			return;
		}

		startRestoreOrganization({ organizationId: firstOrganization.id });
	}, [activeOrganization, organizations, redirectPath, restoreStatus, router, startRestoreOrganization]);

	const handleAcceptInvitation = async ({ invitationId }: { invitationId: string }) => {
		try {
			await acceptInvitation({ invitationId });
		} catch {}
	};

	const handleCreateOrganization = async ({ name, logoFile }: { name: string; logoFile?: File | null }) => {
		try {
			await createOrganization({
				name: name.trim(),
				logoFile: logoFile ?? null,
			});
			return null;
		} catch (error) {
			return error instanceof Error ? error.message : t("errors.createOrganization");
		}
	};

	const handleRestoreOrganization = async () => {
		const firstOrganization = organizations?.[0];
		if (!firstOrganization) {
			return;
		}

		try {
			await restoreOrganization({ organizationId: firstOrganization.id });
		} catch {}
	};

	return {
		hasExistingOrganization: (organizations?.length ?? 0) > 0,
		hasInvitationLoadError: Boolean(invitationsError),
		hasRestoreError,
		handleAcceptInvitation,
		handleCreateOrganization,
		handleRestoreOrganization,
		invitations: invitationsData ?? [],
		isAcceptingInvitation,
		isCreatingOrganization,
		isLoadingOrganizations: isActiveOrganizationPending || isOrganizationsPending,
		isLoadingInvitations: isInvitationsPending,
		isRestoringOrganization,
		pendingInvitationId: isAcceptingInvitation ? (acceptInvitationVariables?.invitationId ?? null) : null,
		retryInvitationLoad: refetchInvitations,
	};
};
