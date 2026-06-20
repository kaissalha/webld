import type { Transition } from "motion/react";

export const composerSpring = { type: "spring", duration: 0.4, bounce: 0 } as const;

export const controlLayoutSpring = {
	type: "spring",
	stiffness: 620,
	damping: 46,
	mass: 0.55,
} as const;

export const fadeEase = [0.23, 1, 0.32, 1] as const;

export const controlLayoutTransition: Transition = {
	layout: controlLayoutSpring,
	opacity: { duration: 0.1, ease: fadeEase },
	scale: { duration: 0.12, ease: fadeEase },
};
