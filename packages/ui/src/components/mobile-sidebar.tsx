"use client";

import * as React from "react";

import { cn } from "../lib/utils";
import { Drawer, DrawerPopup, DrawerTitle } from "./drawer";
import { type SidebarPurpose, useSidebar } from "./sidebar";

const SIDEBAR_WIDTH_MOBILE = "18rem";

export const MobileSidebar = ({
	ref,
	side,
	purpose,
	children,
	...props
}: React.ComponentProps<"div"> & {
	side: "left" | "right";
	purpose: SidebarPurpose;
	children: React.ReactNode;
}) => {
	const { openMobile, setOpenMobile } = useSidebar(purpose);
	const sidebarWidthVar = `--sidebar-width-${purpose}`;

	return (
		<Drawer open={openMobile} onOpenChange={(open) => setOpenMobile(open)} position={side}>
			<DrawerPopup
				ref={ref}
				variant='inset'
				data-sidebar='sidebar'
				data-mobile='true'
				className={cn(
					"bg-sidebar p-0 text-sidebar-foreground *:data-[slot=drawer-close]:hidden",
					purpose !== "navigation" && "w-full"
				)}
				style={
					{
						[sidebarWidthVar]: SIDEBAR_WIDTH_MOBILE,
						width: purpose === "navigation" ? `var(${sidebarWidthVar})` : undefined,
					} as React.CSSProperties
				}
				{...props}
			>
				<DrawerTitle className='sr-only'>Sidebar</DrawerTitle>
				<div className='flex h-full w-full flex-col'>{children}</div>
			</DrawerPopup>
		</Drawer>
	);
};
