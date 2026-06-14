"use client";

import { createContext, useContext } from "react";

import type * as flags from "@/flags";

export type Flags = {
	[key in keyof typeof flags]: Awaited<ReturnType<(typeof flags)[key]>>;
};

const FlagsContext = createContext<Flags | null>(null);

export const FlagsProvider = ({ values, children }: { values: Flags; children: React.ReactNode }) => {
	return <FlagsContext.Provider value={values}>{children}</FlagsContext.Provider>;
};

export const useFlags = () => {
	const ctx = useContext(FlagsContext);
	if (!ctx) throw new Error("useFlags must be used inside <FlagsProvider>");
	return ctx;
};
