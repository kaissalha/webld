"use client";

import { type Context, createContext, use, useCallback, useEffect, useMemo, useState } from "react";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { atom, useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { MenuIcon, SidebarIcon } from "lucide-react";

import { useIsMobile } from "@webld/ui/hooks/use-mobile";
import { cn } from "@webld/ui/lib/utils";

import { useHydrated } from "../hooks/use-hydrated";
import { Button } from "./button";
import { Input } from "./input";
import { MobileSidebar } from "./mobile-sidebar";
import { Separator } from "./separator";
import { Skeleton } from "./skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

const SIDEBAR_WIDTH_ICON = "4rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

/**
 * Sidebar purpose defines the semantic role of the sidebar.
 * Each purpose is mapped to a physical side based on text direction.
 */
type SidebarPurpose = "navigation" | "chat" | "details";

/**
 * Navigation stays icon-only on desktop; other panels persist their last open state.
 */
const sidebarAtoms = {
	navigation: atom(false),
	chat: atomWithStorage("sidebar:chat:state", true, undefined, {
		getOnInit: true,
	}),
	details: atomWithStorage("sidebar:details:state", true, undefined, {
		getOnInit: true,
	}),
} as const;

/**
 * Physical side where the sidebar is rendered.
 * This is derived from purpose + text direction.
 */
type Side = "left" | "right";

type SidebarCollapsible = "offcanvas" | "icon" | "none";

/**
 * Default widths for each sidebar purpose.
 * Navigation sidebars are typically narrower, panels are wider.
 */
const SIDEBAR_WIDTH_BY_PURPOSE: Record<SidebarPurpose, string> = {
	navigation: "16rem",
	chat: "30rem",
	details: "30rem",
};

/**
 * Maps sidebar purpose to physical side based on text direction.
 * - Navigation: appears on the start side (left in LTR, right in RTL)
 * - Chat/details: appears on the end side (right in LTR, left in RTL)
 */
const getSideFromPurpose = (purpose: SidebarPurpose, dir: "ltr" | "rtl" = "ltr"): Side => {
	if (purpose === "navigation") {
		return dir === "ltr" ? "left" : "right";
	}
	// chat and details sidebars appear on the end side
	return dir === "ltr" ? "right" : "left";
};

type SidebarOpenOptions = {
	/** Close all other sidebars when opening this one */
	closeOthers?: boolean;
};

type SidebarSetOpenFn = (open: boolean, options?: SidebarOpenOptions) => void;

type SidebarContext = {
	state: "expanded" | "collapsed";
	open: boolean;
	setOpen: SidebarSetOpenFn;
	openMobile: boolean;
	setOpenMobile: SidebarSetOpenFn;
	isMobile: boolean;
	toggleSidebar: () => void;
	purpose: SidebarPurpose;
	side: Side;
};

const SidebarContext = createContext<SidebarContext | null>(null);

// Registry for dynamically created sidebar contexts keyed by purpose
const sidebarContextRegistry = new Map<string, Context<SidebarContext | null>>();
sidebarContextRegistry.set("navigation", SidebarContext);

// Global registry to track all active sidebar setters for cross-sidebar communication
type SidebarSetters = {
	setOpen: (open: boolean) => void;
	setOpenMobile: (open: boolean) => void;
};
const sidebarSettersRegistry = new Map<SidebarPurpose, SidebarSetters>();

const getSidebarContext = (purpose: SidebarPurpose) => {
	const existingContext = sidebarContextRegistry.get(purpose);

	if (existingContext) {
		return existingContext;
	}

	const sidebarContext = createContext<SidebarContext | null>(null);
	sidebarContextRegistry.set(purpose, sidebarContext);

	return sidebarContext;
};

/**
 * Context to track which sidebar purpose we're currently inside.
 * Used by child components (SidebarRail, SidebarMenuButton, etc.) to know
 * which sidebar context to use without requiring explicit purpose prop.
 */
const CurrentSidebarPurposeContext = createContext<SidebarPurpose | null>(null);

/**
 * Hook to get the sidebar context.
 * If purpose is provided, uses that specific sidebar context.
 * If not provided, uses the current sidebar context from the nearest Sidebar parent.
 */
const useSidebar = (purpose?: SidebarPurpose) => {
	const currentPurpose = use(CurrentSidebarPurposeContext);
	const resolvedPurpose = purpose ?? currentPurpose;

	if (!resolvedPurpose) {
		throw new Error("useSidebar must be used within a Sidebar or provide a purpose argument.");
	}

	const context = use(getSidebarContext(resolvedPurpose));

	if (!context) {
		throw new Error("useSidebar must be used within a SidebarProvider.");
	}

	return context;
};

const SidebarProvider = ({
	ref,
	purpose = "navigation",
	dir = "ltr",
	defaultOpen = true,
	onOpenChange,
	className,
	style,
	children,
	...props
}: React.ComponentProps<"div"> & {
	purpose?: SidebarPurpose;
	dir?: "ltr" | "rtl";
	/** Initial state before Jotai hydrates from storage */
	defaultOpen?: boolean;
	/** Called when sidebar state changes (for side effects only) */
	onOpenChange?: (open: boolean) => void;
}) => {
	const isMobile = useIsMobile();
	const [openMobile, _setOpenMobile] = useState(false);

	// Derive the physical side from purpose and direction
	const side = getSideFromPurpose(purpose, dir);

	// Read sidebar state. Panel sidebars hydrate from storage; navigation is ephemeral.
	// defaultOpen is used as fallback on initial render before storage is read
	const [storedOpen, _setOpen] = useAtom(sidebarAtoms[purpose]);
	const isHydrated = useHydrated();
	const isDesktopNavigation = purpose === "navigation" && !isMobile;

	// Navigation should always stay collapsed to icon mode on desktop.
	const open = isDesktopNavigation ? false : isHydrated ? storedOpen : defaultOpen;

	const internalSetOpen = useCallback(
		(value: boolean) => {
			const nextValue = isDesktopNavigation ? false : value;
			_setOpen(nextValue);
			onOpenChange?.(nextValue);
		},
		[_setOpen, isDesktopNavigation, onOpenChange]
	);

	// Register this sidebar's setters in the global registry
	useEffect(() => {
		sidebarSettersRegistry.set(purpose, {
			setOpen: internalSetOpen,
			setOpenMobile: _setOpenMobile,
		});
		return () => {
			sidebarSettersRegistry.delete(purpose);
		};
	}, [purpose, internalSetOpen]);

	// Close all other sidebars
	const closeOtherSidebars = useCallback(() => {
		sidebarSettersRegistry.forEach((setters, key) => {
			if (key !== purpose) {
				setters.setOpen(false);
				setters.setOpenMobile(false);
			}
		});
	}, [purpose]);

	// Public setOpen with options
	const setOpen: SidebarSetOpenFn = useCallback(
		(value, options) => {
			if (options?.closeOthers) {
				closeOtherSidebars();
			}
			internalSetOpen(value);
		},
		[internalSetOpen, closeOtherSidebars]
	);

	// Public setOpenMobile with options
	const setOpenMobile: SidebarSetOpenFn = useCallback(
		(value, options) => {
			if (options?.closeOthers) {
				closeOtherSidebars();
			}
			_setOpenMobile(value);
		},
		[closeOtherSidebars]
	);

	// Helper to toggle the sidebar.
	const toggleSidebar = useCallback(() => {
		return isMobile ? setOpenMobile(!openMobile) : setOpen(!open);
	}, [isMobile, setOpen, setOpenMobile, open, openMobile]);

	// Adds a keyboard shortcut to toggle the sidebar.
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				toggleSidebar();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [toggleSidebar]);

	// We add a state so that we can do data-state="expanded" or "collapsed".
	// This makes it easier to style the sidebar with Tailwind classes.
	const state = open ? "expanded" : "collapsed";

	const contextValue = useMemo<SidebarContext>(
		() => ({
			state,
			open,
			setOpen,
			isMobile,
			openMobile,
			setOpenMobile,
			toggleSidebar,
			purpose,
			side,
		}),
		[state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar, purpose, side]
	);

	const DynamicContext = getSidebarContext(purpose);

	return (
		<DynamicContext.Provider value={contextValue}>
			<TooltipProvider delay={0}>
				<div
					style={
						{
							[`--sidebar-width-${purpose}`]: SIDEBAR_WIDTH_BY_PURPOSE[purpose],
							"--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
							...style,
						} as React.CSSProperties
					}
					className={cn(
						"group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex h-full w-full flex-1",
						className
					)}
					ref={ref}
					{...props}
				>
					{children}
				</div>
			</TooltipProvider>
		</DynamicContext.Provider>
	);
};
SidebarProvider.displayName = "SidebarProvider";

const Sidebar = ({
	ref,
	purpose = "navigation",
	variant = "sidebar",
	collapsible = "offcanvas",
	className,
	children,
	...props
}: React.ComponentProps<"div"> & {
	purpose?: SidebarPurpose;
	variant?: "sidebar" | "floating" | "inset";
	collapsible?: SidebarCollapsible;
}) => {
	const { state, side } = useSidebar(purpose);

	const sidebarWidthVar = `--sidebar-width-${purpose}`;

	if (collapsible === "none") {
		return (
			<CurrentSidebarPurposeContext.Provider value={purpose}>
				<div
					className={cn("flex h-full flex-col bg-sidebar text-sidebar-foreground", className)}
					style={{ width: `var(${sidebarWidthVar})` }}
					ref={ref}
					{...props}
				>
					{children}
				</div>
			</CurrentSidebarPurposeContext.Provider>
		);
	}

	return (
		<CurrentSidebarPurposeContext.Provider value={purpose}>
			<div className='md:hidden'>
				<MobileSidebar side={side} purpose={purpose} {...props}>
					{children}
				</MobileSidebar>
			</div>
			<div
				ref={ref}
				className='group peer relative hidden text-sidebar-foreground md:block'
				data-state={state}
				data-collapsible={state === "collapsed" ? collapsible : ""}
				data-variant={variant}
				data-side={side}
				data-purpose={purpose}
			>
				{/* This is what handles the sidebar gap on desktop */}
				<div
					style={
						{
							"--sidebar-width": `var(${sidebarWidthVar})`,
						} as React.CSSProperties
					}
					className={cn(
						"w-(--sidebar-width) relative h-full bg-transparent transition-[width] duration-300 ease-[cubic-bezier(0.25,0.5,0.25,1)]",
						"group-data-[collapsible=offcanvas]:w-0",
						"group-data-[side=right]:rotate-180",
						variant === "floating" || variant === "inset"
							? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
							: "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
					)}
				/>
				<div
					style={
						{
							"--sidebar-width": `var(${sidebarWidthVar})`,
						} as React.CSSProperties
					}
					className={cn(
						"w-(--sidebar-width) absolute inset-y-0 z-10 hidden transition-[inset-inline-start,inset-inline-end,width] duration-300 ease-[cubic-bezier(0.25,0.5,0.25,1)] md:flex",
						side === "left"
							? "inset-s-0 group-data-[collapsible=offcanvas]:inset-s-[calc(var(--sidebar-width)*-1)]"
							: "inset-e-0 group-data-[collapsible=offcanvas]:inset-e-[calc(var(--sidebar-width)*-1)]",
						// Adjust the padding for floating and inset variants.
						variant === "floating" || variant === "inset"
							? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
							: "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-e group-data-[side=right]:border-s",
						className
					)}
					{...props}
				>
					<div
						data-sidebar='sidebar'
						className='flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow-sm'
					>
						{children}
					</div>
				</div>
			</div>
		</CurrentSidebarPurposeContext.Provider>
	);
};
Sidebar.displayName = "Sidebar";

const SidebarTrigger = ({
	ref,
	className,
	onClick,
	label,
	purpose,
	...props
}: React.ComponentProps<typeof Button> & { label?: string; purpose: SidebarPurpose }) => {
	const { toggleSidebar } = useSidebar(purpose);

	return (
		<Button
			ref={ref}
			data-sidebar='trigger'
			variant='ghost'
			size='icon'
			className={className}
			onClick={(event) => {
				onClick?.(event);
				toggleSidebar();
			}}
			{...props}
		>
			<MenuIcon className='text-muted-foreground md:hidden' />
			<SidebarIcon className='hidden size-4.5 text-muted-foreground md:block' />
			<span className='sr-only'>Toggle Sidebar</span>
			{label && <span className='ms-3 text-sm font-medium text-foreground md:hidden'>{label}</span>}
		</Button>
	);
};
SidebarTrigger.displayName = "SidebarTrigger";

const SidebarRail = ({ ref, className, ...props }: React.ComponentProps<"button">) => {
	const { toggleSidebar } = useSidebar();

	return (
		<button
			type='button'
			ref={ref}
			data-sidebar='rail'
			aria-label='Toggle Sidebar'
			tabIndex={-1}
			onClick={toggleSidebar}
			title='Toggle Sidebar'
			className={cn(
				"absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all duration-300 ease-[cubic-bezier(0.25,0.5,0.25,1)] after:absolute after:inset-y-0 after:inset-s-1/2 after:w-0.5 hover:after:bg-sidebar-border group-data-[side=left]:-inset-e-4 group-data-[side=right]:inset-s-0 sm:flex",
				"in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
				"[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
				"group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:start-full hover:group-data-[collapsible=offcanvas]:bg-sidebar",
				"[[data-side=left][data-collapsible=offcanvas]_&]:-inset-e-2",
				"[[data-side=right][data-collapsible=offcanvas]_&]:-inset-s-2",
				className
			)}
			{...props}
		/>
	);
};
SidebarRail.displayName = "SidebarRail";

const SidebarInset = ({ ref, className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div
			ref={ref}
			className={cn(
				"relative flex min-w-0 flex-1 flex-col bg-background max-h-dvh md:h-full md:overflow-auto",
				className
			)}
			{...props}
		/>
	);
};
SidebarInset.displayName = "SidebarInset";

const SidebarInput = ({ className, ...props }: React.ComponentProps<typeof Input>) => {
	return (
		<Input
			data-sidebar='input'
			className={cn(
				"h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
				className
			)}
			{...props}
		/>
	);
};
SidebarInput.displayName = "SidebarInput";

const SidebarHeader = ({ ref, className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div
			ref={ref}
			data-sidebar='header'
			className={cn("flex flex-col gap-3 px-4 py-4 md:pb-0", className)}
			{...props}
		/>
	);
};
SidebarHeader.displayName = "SidebarHeader";

const SidebarFooter = ({ ref, className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div ref={ref} data-sidebar='footer' className={cn("flex flex-col gap-2 px-3 pb-4", className)} {...props} />
	);
};
SidebarFooter.displayName = "SidebarFooter";

const SidebarSeparator = ({ className, ...props }: React.ComponentProps<typeof Separator>) => {
	return <Separator data-sidebar='separator' className={cn("mx-2 w-auto bg-sidebar-border", className)} {...props} />;
};
SidebarSeparator.displayName = "SidebarSeparator";

const SidebarContent = ({ ref, className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div
			ref={ref}
			data-sidebar='content'
			className={cn(
				"flex flex-1 flex-col gap-2 overflow-auto px-2 md:px-3 py-1.5 md:py-4 group-data-[collapsible=icon]:overflow-hidden",
				className
			)}
			{...props}
		/>
	);
};
SidebarContent.displayName = "SidebarContent";

const SidebarGroup = ({ ref, className, ...props }: React.ComponentProps<"div">) => {
	return (
		<div
			ref={ref}
			data-sidebar='group'
			className={cn("relative flex w-full min-w-0 flex-col", className)}
			{...props}
		/>
	);
};
SidebarGroup.displayName = "SidebarGroup";

const SidebarGroupLabel = ({
	ref,
	className,
	asChild = false,
	...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			ref={ref}
			data-sidebar='group-label'
			data-testid='sidebar-group-label'
			className={cn(
				"outline-hidden flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring transition-[margin,opacity] duration-300 ease-[cubic-bezier(0.25,0.5,0.25,1)] focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
				"group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
				className
			)}
			{...props}
		/>
	);
};
SidebarGroupLabel.displayName = "SidebarGroupLabel";

const SidebarGroupAction = ({
	ref,
	className,
	asChild = false,
	...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) => {
	const Comp = asChild ? Slot : "button";

	return (
		<Comp
			ref={ref}
			data-sidebar='group-action'
			data-testid='sidebar-group-action'
			className={cn(
				"outline-hidden absolute inset-e-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
				// Increases the hit area of the button on mobile.
				"after:absolute after:-inset-2 md:after:hidden",
				"group-data-[collapsible=icon]:hidden",
				className
			)}
			{...props}
		/>
	);
};
SidebarGroupAction.displayName = "SidebarGroupAction";

const SidebarGroupContent = ({ ref, className, ...props }: React.ComponentProps<"div">) => (
	<div
		ref={ref}
		data-sidebar='group-content'
		data-testid='sidebar-group-content'
		className={cn("w-full text-sm", className)}
		{...props}
	/>
);
SidebarGroupContent.displayName = "SidebarGroupContent";

const SidebarMenu = ({ ref, className, ...props }: React.ComponentProps<"ul">) => (
	<ul
		ref={ref}
		data-sidebar='menu'
		data-testid='sidebar-menu'
		className={cn("flex w-full min-w-0 flex-col gap-2 md:gap-1.5", className)}
		{...props}
	/>
);
SidebarMenu.displayName = "SidebarMenu";

const SidebarMenuItem = ({ ref, className, ...props }: React.ComponentProps<"li">) => {
	return (
		<li
			ref={ref}
			data-sidebar='menu-item'
			data-testid='sidebar-menu-item'
			className={cn("group/menu-item relative px-1", className)}
			{...props}
		/>
	);
};
SidebarMenuItem.displayName = "SidebarMenuItem";

const sidebarMenuButtonVariants = cva(
	"peer/menu-button outline-hidden group-has-data-[sidebar=menu-action]/menu-item:pe-8 group-data-[collapsible=icon]:px-2! flex w-fit items-center gap-2 overflow-hidden rounded-lg px-3 py-2 text-start font-medium ring-sidebar-ring transition-[background,color,width,height,padding] hover:bg-sidebar-accent focus-visible:ring-2 active:bg-sidebar-accent disabled:pointer-events-none disabled:opacity-50 has-[>svg:first-child]:pe-4 has-[>svg:last-child]:ps-4 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[state=open]:hover:bg-sidebar-accent md:h-auto md:px-2 md:has-[>svg:first-child]:pe-3 md:has-[>svg:last-child]:ps-3 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 md:[&>svg]:size-4 justify-center max-h-8",
	{
		variants: {
			variant: {
				default:
					"text-muted-foreground hover:text-foreground data-[active=true]:text-foreground data-[state=open]:hover:text-foreground",
				outline:
					"bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
			},
			size: {
				default: "text-sm",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	}
);

const SidebarMenuButton = ({
	ref,
	asChild = false,
	isActive = false,
	variant = "default",
	size = "default",
	tooltip,
	className,
	...props
}: React.ComponentProps<"button"> & {
	asChild?: boolean;
	isActive?: boolean;
	tooltip?: string | React.ComponentProps<typeof TooltipContent>;
} & VariantProps<typeof sidebarMenuButtonVariants>) => {
	const Comp = asChild ? Slot : "button";
	const { isMobile, state } = useSidebar();

	const button = (
		<Comp
			ref={ref}
			data-sidebar='menu-button'
			data-testid='sidebar-menu-button'
			data-size={size}
			data-active={isActive}
			className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
			{...props}
		/>
	);

	if (!tooltip) {
		return button;
	}

	if (typeof tooltip === "string") {
		tooltip = {
			children: tooltip,
		};
	}

	return (
		<Tooltip>
			<TooltipTrigger render={button} />
			<TooltipContent side='right' align='center' hidden={state !== "collapsed" || isMobile} {...tooltip} />
		</Tooltip>
	);
};
SidebarMenuButton.displayName = "SidebarMenuButton";

const SidebarMenuAction = ({
	ref,
	className,
	asChild = false,
	showOnHover = false,
	...props
}: React.ComponentProps<"button"> & {
	asChild?: boolean;
	showOnHover?: boolean;
}) => {
	const Comp = asChild ? Slot : "button";

	return (
		<Comp
			ref={ref}
			data-sidebar='menu-action'
			data-testid='sidebar-menu-action'
			className={cn(
				"outline-hidden absolute inset-e-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
				// Increases the hit area of the button on mobile.
				"after:absolute after:-inset-2 md:after:hidden",
				"peer-data-[size=sm]/menu-button:top-1",
				"peer-data-[size=default]/menu-button:top-1.5",
				"peer-data-[size=lg]/menu-button:top-2.5",
				"group-data-[collapsible=icon]:hidden",
				showOnHover &&
					"group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
				className
			)}
			{...props}
		/>
	);
};
SidebarMenuAction.displayName = "SidebarMenuAction";

const SidebarMenuBadge = ({ ref, className, ...props }: React.ComponentProps<"div">) => (
	<div
		ref={ref}
		data-sidebar='menu-badge'
		className={cn(
			"pointer-events-none absolute inset-e-1 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground",
			"peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
			"peer-data-[size=sm]/menu-button:top-1",
			"peer-data-[size=default]/menu-button:top-1.5",
			"peer-data-[size=lg]/menu-button:top-2.5",
			"group-data-[collapsible=icon]:hidden",
			className
		)}
		{...props}
	/>
);
SidebarMenuBadge.displayName = "SidebarMenuBadge";

const SidebarMenuSkeleton = ({
	ref,
	className,
	showIcon = false,
	...props
}: React.ComponentProps<"div"> & {
	showIcon?: boolean;
}) => {
	// Random width between 50 to 90%.
	const [width] = useState(() => {
		return `${Math.floor(Math.random() * 40) + 50}%`;
	});

	return (
		<div
			ref={ref}
			data-sidebar='menu-skeleton'
			className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
			{...props}
		>
			{showIcon && <Skeleton className='size-4 rounded-md' data-sidebar='menu-skeleton-icon' />}
			<Skeleton
				className='max-w-(--skeleton-width) h-4 flex-1'
				data-sidebar='menu-skeleton-text'
				style={
					{
						"--skeleton-width": width,
					} as React.CSSProperties
				}
			/>
		</div>
	);
};
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton";

const SidebarMenuSub = ({ ref, className, ...props }: React.ComponentProps<"ul">) => (
	<ul
		ref={ref}
		data-sidebar='menu-sub'
		className={cn(
			"mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-s border-sidebar-border px-2.5 py-0.5",
			"group-data-[collapsible=icon]:hidden",
			className
		)}
		{...props}
	/>
);
SidebarMenuSub.displayName = "SidebarMenuSub";

const SidebarMenuSubItem = ({ ref, ...props }: React.ComponentProps<"li">) => <li ref={ref} {...props} />;
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

const SidebarMenuSubButton = ({
	ref,
	asChild = false,
	size = "md",
	isActive,
	className,
	...props
}: React.ComponentProps<"a"> & {
	asChild?: boolean;
	size?: "sm" | "md";
	isActive?: boolean;
}) => {
	const Comp = asChild ? Slot : "a";

	return (
		<Comp
			ref={ref}
			data-sidebar='menu-sub-button'
			data-size={size}
			data-active={isActive}
			className={cn(
				"outline-hidden flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
				"data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
				size === "sm" && "text-xs",
				size === "md" && "text-sm",
				"group-data-[collapsible=icon]:hidden",
				className
			)}
			{...props}
		/>
	);
};
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";

export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInput,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
	useSidebar,
};

export type { SidebarPurpose, Side, SidebarOpenOptions };
