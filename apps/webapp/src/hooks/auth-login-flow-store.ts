import { create, useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

type AuthLoginFlowState = {
	email: string;
	isOtpSent: boolean;
	otpSentAt: Date | null;
	beginOtp: ({ email }: { email: string }) => void;
	reset: () => void;
};

const authLoginFlowStore = create<AuthLoginFlowState>((set) => ({
	email: "",
	isOtpSent: false,
	otpSentAt: null,
	beginOtp: ({ email }) => set({ isOtpSent: true, email, otpSentAt: new Date() }),
	reset: () => set({ isOtpSent: false, email: "", otpSentAt: null }),
}));

export const useAuthLoginFlowStore = <T>(selector: (state: AuthLoginFlowState) => T): T => {
	return useStore(authLoginFlowStore, useShallow(selector));
};
