"use client";

import type { ReactNode } from "react";

// Wraps a run of reasoning/tool steps so their per-step connector lines read as a
// single vertical timeline (chain-of-thought style).
export const ChatSteps = ({ children }: { children: ReactNode }) => {
	return <div className='my-1 flex flex-col'>{children}</div>;
};

ChatSteps.displayName = "ChatSteps";
