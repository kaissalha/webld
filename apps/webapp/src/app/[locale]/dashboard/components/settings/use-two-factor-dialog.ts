"use client";

import { useCallback, useMemo, useReducer } from "react";

import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { toast } from "@webld/ui/components/sonner";

type SetupStep = "password" | "scan" | "verify";
type DialogMode = "enable" | "disable";

type TwoFactorDialogState = {
	backupCodes: string[];
	dialogMode: DialogMode;
	isLoading: boolean;
	isSetupOpen: boolean;
	password: string;
	setupStep: SetupStep;
	totpUri: string;
	verificationCode: string;
};

type TwoFactorDialogAction =
	| { type: "close" }
	| { type: "open-disable" }
	| { type: "open-enable" }
	| { type: "stop-loading" }
	| { type: "set-loading"; value: boolean }
	| { type: "set-password"; value: string }
	| { type: "set-step"; value: SetupStep }
	| { type: "set-verification-code"; value: string }
	| { type: "start-enable-success"; backupCodes: string[]; totpUri: string };

const createInitialState = (): TwoFactorDialogState => ({
	backupCodes: [],
	dialogMode: "enable",
	isLoading: false,
	isSetupOpen: false,
	password: "",
	setupStep: "password",
	totpUri: "",
	verificationCode: "",
});

const createOpenDialogState = ({ dialogMode }: { dialogMode: DialogMode }): TwoFactorDialogState => ({
	...createInitialState(),
	dialogMode,
	isSetupOpen: true,
});

const twoFactorDialogReducer = (state: TwoFactorDialogState, action: TwoFactorDialogAction) => {
	switch (action.type) {
		case "close":
			return createInitialState();
		case "open-enable":
			return createOpenDialogState({ dialogMode: "enable" });
		case "open-disable":
			return createOpenDialogState({ dialogMode: "disable" });
		case "set-loading":
			return {
				...state,
				isLoading: action.value,
			};
		case "set-password":
			return {
				...state,
				password: action.value,
			};
		case "set-step":
			return {
				...state,
				setupStep: action.value,
			};
		case "set-verification-code":
			return {
				...state,
				verificationCode: action.value,
			};
		case "start-enable-success":
			return {
				...state,
				backupCodes: action.backupCodes,
				setupStep: "scan",
				totpUri: action.totpUri,
			} satisfies TwoFactorDialogState;
		case "stop-loading":
			return {
				...state,
				isLoading: false,
			};
		default:
			return state;
	}
};

export const useTwoFactorDialog = ({ refetch }: { refetch: () => Promise<unknown> | unknown }) => {
	const t = useTranslations("settings");
	const tCommon = useTranslations("common");
	const [state, dispatch] = useReducer(twoFactorDialogReducer, undefined, createInitialState);

	const canDisable = useMemo(() => Boolean(state.password), [state.password]);
	const canVerify = useMemo(() => state.verificationCode.length === 6, [state.verificationCode]);

	const closeDialog = useCallback(() => {
		dispatch({ type: "close" });
	}, []);

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) {
				closeDialog();
			}
		},
		[closeDialog]
	);

	const startSetup = useCallback(() => {
		dispatch({ type: "open-enable" });
	}, []);

	const startDisable = useCallback(() => {
		dispatch({ type: "open-disable" });
	}, []);

	const setPassword = useCallback((value: string) => {
		dispatch({ type: "set-password", value });
	}, []);

	const setVerificationCode = useCallback((value: string) => {
		dispatch({ type: "set-verification-code", value });
	}, []);

	const goToScanStep = useCallback(() => {
		dispatch({ type: "set-step", value: "scan" });
	}, []);

	const goToVerifyStep = useCallback(() => {
		dispatch({ type: "set-step", value: "verify" });
	}, []);

	const enableTwoFactor = useCallback(async () => {
		if (!state.password) {
			return;
		}

		dispatch({ type: "set-loading", value: true });

		const result = await authClient.twoFactor
			.enable({
				password: state.password,
			})
			.catch(() => null);

		dispatch({ type: "stop-loading" });

		if (!result) {
			toast.error(tCommon("errors.somethingWentWrong"));
			return;
		}

		if (result.error) {
			toast.error(t("security.mfa.errors.enableFailed"));
			return;
		}

		if (!result.data?.totpURI) {
			return;
		}

		dispatch({
			type: "start-enable-success",
			backupCodes: result.data.backupCodes ?? [],
			totpUri: result.data.totpURI,
		});
	}, [state.password, t, tCommon]);

	const verifyTotp = useCallback(async () => {
		if (state.verificationCode.length !== 6) {
			return;
		}

		dispatch({ type: "set-loading", value: true });

		const result = await authClient.twoFactor
			.verifyTotp({
				code: state.verificationCode,
			})
			.catch(() => null);

		dispatch({ type: "stop-loading" });

		if (!result) {
			toast.error(tCommon("errors.somethingWentWrong"));
			return;
		}

		if (result.error) {
			toast.error(t("security.mfa.errors.invalidCode"));
			return;
		}

		toast.success(t("security.mfa.success.enabled"));
		dispatch({ type: "close" });
		await Promise.resolve(refetch());
	}, [refetch, state.verificationCode, t, tCommon]);

	const disableTwoFactor = useCallback(async () => {
		if (!state.password) {
			return;
		}

		dispatch({ type: "set-loading", value: true });

		const result = await authClient.twoFactor
			.disable({
				password: state.password,
			})
			.catch(() => null);

		dispatch({ type: "stop-loading" });

		if (!result) {
			toast.error(tCommon("errors.somethingWentWrong"));
			return;
		}

		if (result.error) {
			toast.error(t("security.mfa.errors.disableFailed"));
			return;
		}

		toast.success(t("security.mfa.success.disabled"));
		dispatch({ type: "close" });
		await Promise.resolve(refetch());
	}, [refetch, state.password, t, tCommon]);

	return {
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
		state,
		verifyTotp,
	};
};
