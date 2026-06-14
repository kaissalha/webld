"use client";

import { createContext, use, useMemo, useState } from "react";
import type { ComponentProps, ReactNode } from "react";

import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { CheckIcon, ChevronRightIcon, XIcon } from "lucide-react";

import { cn } from "../lib/utils";
import { ScrollArea } from "./scroll-area";

type DrawerPosition = "right" | "left" | "top" | "bottom";
type DrawerSwipeDirection = "up" | "down" | "left" | "right";

const drawerSwipeDirections: Record<DrawerPosition, DrawerSwipeDirection> = {
	bottom: "down",
	left: "left",
	right: "right",
	top: "up",
};

type DrawerContextValue = {
	position: DrawerPosition;
	swipeDirection: DrawerSwipeDirection;
};

const DrawerContext = createContext<DrawerContextValue>({
	position: "bottom",
	swipeDirection: "down",
});

const useDrawerContext = () => use(DrawerContext);

type DrawerProps = DrawerPrimitive.Root.Props & {
	position?: DrawerPosition;
};

const Drawer = ({ position = "bottom", swipeDirection, ...props }: DrawerProps) => {
	const resolvedSwipeDirection = swipeDirection ?? drawerSwipeDirections[position];
	const contextValue = useMemo(
		() => ({
			position,
			swipeDirection: resolvedSwipeDirection,
		}),
		[position, resolvedSwipeDirection]
	);

	return (
		<DrawerContext.Provider value={contextValue}>
			<DrawerPrimitive.Root
				data-position={position}
				data-slot='drawer'
				swipeDirection={resolvedSwipeDirection}
				{...props}
			/>
		</DrawerContext.Provider>
	);
};

const DrawerTrigger = (props: DrawerPrimitive.Trigger.Props) => {
	return <DrawerPrimitive.Trigger data-slot='drawer-trigger' {...props} />;
};

const DrawerPortal = (props: DrawerPrimitive.Portal.Props) => {
	return <DrawerPrimitive.Portal {...props} />;
};

const DrawerClose = (props: DrawerPrimitive.Close.Props) => {
	return <DrawerPrimitive.Close data-slot='drawer-close' {...props} />;
};

const DrawerBackdrop = ({ className, ...props }: DrawerPrimitive.Backdrop.Props) => {
	return (
		<DrawerPrimitive.Backdrop
			data-slot='drawer-backdrop'
			className={cn(
				"fixed inset-0 z-60 bg-foreground/32 backdrop-blur-sm transition-opacity duration-350 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0",
				"data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*350ms)]",
				"[--backdrop-opacity:0.32] opacity-[calc(var(--backdrop-opacity)*(1-var(--drawer-swipe-progress,0)))]",
				"data-swiping:transition-none",
				className
			)}
			{...props}
		/>
	);
};

const DrawerViewport = ({ className, ...props }: DrawerPrimitive.Viewport.Props) => {
	const { position } = useDrawerContext();

	return (
		<DrawerPrimitive.Viewport
			data-position={position}
			data-slot='drawer-viewport'
			className={cn(
				// Allow native panning inside the popup; `touch-none` blocks descendant vertical scroll on iOS/WebKit.
				"fixed inset-0 z-60 flex touch-manipulation",
				position === "bottom" && "items-end justify-center",
				position === "top" && "items-start justify-center",
				position === "left" && "items-stretch justify-start",
				position === "right" && "items-stretch justify-end",
				className
			)}
			{...props}
		/>
	);
};

const DrawerBar = ({ className, ...props }: ComponentProps<"div">) => {
	return (
		<div data-slot='drawer-bar-wrap' className='flex justify-center px-4 pt-3'>
			<div data-slot='drawer-bar' className={cn("h-1 w-12 rounded-full bg-border", className)} {...props} />
		</div>
	);
};

type DrawerPopupProps = DrawerPrimitive.Popup.Props & {
	backdropClassName?: string;
	showBar?: boolean;
	showCloseButton?: boolean;
	variant?: "default" | "straight" | "inset";
};

const DrawerPopup = ({
	ref,
	className,
	children,
	backdropClassName,
	showBar = false,
	showCloseButton = false,
	variant = "default",
	...props
}: DrawerPopupProps) => {
	const { position } = useDrawerContext();
	const isBottom = position === "bottom";
	const isTop = position === "top";
	const isLeft = position === "left";
	const isRight = position === "right";
	const isVertical = isBottom || isTop;

	return (
		<DrawerPortal>
			<DrawerBackdrop className={backdropClassName} />
			<DrawerViewport>
				<DrawerPrimitive.Popup
					ref={ref}
					data-position={position}
					data-slot='drawer-popup'
					data-variant={variant}
					className={cn(
						"pointer-events-auto relative flex min-h-0 flex-col bg-popover text-popover-foreground outline-none will-change-transform",
						"transition-[transform,box-shadow,opacity] duration-350 ease-[cubic-bezier(0.32,0.72,0,1)]",
						"data-swiping:transition-none",
						"data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*350ms)]",
						"before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]",
						"shadow-[0_-16px_48px_rgb(0_0_0/0.12),0_6px_18px_rgb(0_0_0/0.06)] dark:shadow-black/24",
						isBottom && [
							"w-full max-h-[min(90dvh,calc(100dvh-1rem))] border border-b-0 rounded-t-3xl",
							"transform-[translate3d(0,calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y,0px)),0)]",
							"data-starting-style:transform-[translateY(100%)]",
							"data-ending-style:transform-[translateY(100%)]",
						],
						isTop && [
							"w-full max-h-[min(90dvh,calc(100dvh-1rem))] border border-t-0 rounded-b-3xl",
							"transform-[translate3d(0,var(--drawer-swipe-movement-y,0px),0)]",
							"data-starting-style:transform-[translateY(-100%)]",
							"data-ending-style:transform-[translateY(-100%)]",
						],
						isRight && [
							"h-full w-full max-w-2xl border-s border-y-0 border-e-0",
							"transform-[translate3d(var(--drawer-swipe-movement-x,0px),0,0)]",
							"data-starting-style:transform-[translateX(100%)]",
							"data-ending-style:transform-[translateX(100%)]",
						],
						isLeft && [
							"h-full w-full max-w-2xl border-e border-y-0 border-s-0",
							"transform-[translate3d(var(--drawer-swipe-movement-x,0px),0,0)]",
							"data-starting-style:transform-[translateX(-100%)]",
							"data-ending-style:transform-[translateX(-100%)]",
						],
						variant === "straight" && "rounded-none shadow-none before:hidden",
						variant === "inset" &&
							(isBottom
								? "sm:mb-2 sm:max-w-3xl sm:rounded-3xl sm:border-b"
								: isTop
									? "sm:mt-2 sm:max-w-3xl sm:rounded-3xl sm:border-t"
									: "m-2 h-[calc(100dvh-1rem)] rounded-3xl"),
						className
					)}
					{...props}
				>
					<DrawerPrimitive.Content data-slot='drawer-content' className='contents'>
						{showBar && isVertical ? <DrawerBar /> : null}
						{children}
						{showCloseButton ? (
							<DrawerPrimitive.Close className="absolute inset-e-3 top-3 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent opacity-72 outline-none transition-[background-color,box-shadow,opacity] hover:bg-accent hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
								<XIcon />
								<span className='sr-only'>Close</span>
							</DrawerPrimitive.Close>
						) : null}
					</DrawerPrimitive.Content>
				</DrawerPrimitive.Popup>
			</DrawerViewport>
		</DrawerPortal>
	);
};

const withOptionalSelection = ({ allowSelection, children }: { allowSelection: boolean; children: ReactNode }) => {
	if (!allowSelection) {
		return children;
	}

	return <DrawerPrimitive.Content className='contents'>{children}</DrawerPrimitive.Content>;
};

const DrawerHeader = ({
	className,
	allowSelection = false,
	...props
}: ComponentProps<"div"> & {
	allowSelection?: boolean;
}) => {
	return withOptionalSelection({
		allowSelection,
		children: (
			<div
				data-slot='drawer-header'
				className={cn("flex w-full min-w-0 flex-col gap-1 px-4 pb-4 pt-4 text-center sm:text-start", className)}
				{...props}
			/>
		),
	});
};

const DrawerFooter = ({
	className,
	allowSelection = true,
	variant = "default",
	...props
}: ComponentProps<"div"> & {
	allowSelection?: boolean;
	variant?: "default" | "bare";
}) => {
	return withOptionalSelection({
		allowSelection,
		children: (
			<div
				data-slot='drawer-footer'
				data-variant={variant}
				className={cn(
					"mt-auto flex flex-col-reverse gap-3 px-4 py-4 sm:flex-row sm:justify-end",
					variant === "default" && "border-t bg-muted/50",
					className
				)}
				{...props}
			/>
		),
	});
};

const DrawerTitle = ({ className, ...props }: DrawerPrimitive.Title.Props) => {
	return (
		<DrawerPrimitive.Title
			data-slot='drawer-title'
			className={cn("font-heading leading-none w-fit justify-start items-start text-start", className)}
			{...props}
		/>
	);
};

const DrawerDescription = ({ className, ...props }: DrawerPrimitive.Description.Props) => {
	return (
		<DrawerPrimitive.Description
			data-slot='drawer-description'
			className={cn("text-sm text-muted-foreground w-fit justify-start", className)}
			{...props}
		/>
	);
};

type DrawerPanelProps = ComponentProps<"div"> & {
	allowSelection?: boolean;
	scrollFade?: boolean;
	scrollable?: boolean;
};

const DrawerPanel = ({
	className,
	children,
	allowSelection = true,
	scrollFade = true,
	scrollable = true,
	...props
}: DrawerPanelProps) => {
	const content = scrollable ? (
		<ScrollArea
			data-slot='drawer-panel'
			scrollFade={scrollFade}
			className={cn("min-h-0 flex-1 px-4 pb-4", className)}
			{...props}
		>
			{children}
		</ScrollArea>
	) : (
		<div data-slot='drawer-panel' className={cn("min-h-0 flex-1 px-4 pb-4", className)} {...props}>
			{children}
		</div>
	);

	return withOptionalSelection({ allowSelection, children: content });
};

const drawerMenuItemClassName =
	"flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground disabled:pointer-events-none disabled:opacity-64 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const DrawerMenu = ({ className, ...props }: ComponentProps<"div">) => {
	return <div data-slot='drawer-menu' className={cn("flex flex-col p-1", className)} {...props} />;
};

const DrawerMenuItem = ({
	ref,
	className,
	variant = "default",
	type = "button",
	...props
}: ComponentProps<"button"> & {
	variant?: "default" | "destructive";
}) => {
	return (
		<button
			ref={ref}
			data-slot='drawer-menu-item'
			data-variant={variant}
			type={type}
			className={cn(
				drawerMenuItemClassName,
				variant === "destructive" && "text-destructive hover:text-destructive focus-visible:text-destructive",
				className
			)}
			{...props}
		/>
	);
};

const DrawerMenuGroup = ({ className, ...props }: ComponentProps<"div">) => {
	return <div data-slot='drawer-menu-group' className={cn("flex flex-col", className)} {...props} />;
};

const DrawerMenuGroupLabel = ({ className, ...props }: ComponentProps<"div">) => {
	return (
		<div
			data-slot='drawer-menu-group-label'
			className={cn("px-3 py-2 text-xs font-medium text-muted-foreground", className)}
			{...props}
		/>
	);
};

const DrawerMenuTrigger = ({ className, children, ...props }: DrawerPrimitive.Trigger.Props) => {
	return (
		<DrawerTrigger className={cn(drawerMenuItemClassName, className)} {...props}>
			<span className='truncate'>{children}</span>
			<ChevronRightIcon className='ms-auto size-4 text-muted-foreground' />
		</DrawerTrigger>
	);
};

type DrawerMenuCheckboxItemProps = Omit<ComponentProps<"button">, "onChange"> & {
	checked?: boolean;
	defaultChecked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	variant?: "default" | "switch";
};

const DrawerMenuCheckboxItem = ({
	className,
	children,
	checked: checkedProp,
	defaultChecked = false,
	onCheckedChange,
	onClick,
	variant = "default",
	type = "button",
	...props
}: DrawerMenuCheckboxItemProps) => {
	const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked);
	const checked = checkedProp ?? uncontrolledChecked;

	return (
		<button
			aria-checked={checked}
			data-slot='drawer-menu-checkbox-item'
			data-variant={variant}
			role='menuitemcheckbox'
			type={type}
			className={cn(drawerMenuItemClassName, className)}
			onClick={(event) => {
				const nextChecked = !checked;

				if (checkedProp === undefined) {
					setUncontrolledChecked(nextChecked);
				}

				onCheckedChange?.(nextChecked);
				onClick?.(event);
			}}
			{...props}
		>
			{variant === "switch" ? (
				<span
					aria-hidden='true'
					className={cn(
						"inline-flex h-4.5 w-7.5 shrink-0 rounded-full p-px inset-shadow-[0_1px_--theme(--color-black/4%)] transition-colors",
						checked ? "bg-primary" : "bg-input"
					)}
				>
					<span
						className={cn(
							"block size-4 rounded-full bg-background shadow-sm transition-transform",
							checked ? "translate-x-3 rtl:-translate-x-3" : "translate-x-0"
						)}
					/>
				</span>
			) : (
				<span
					aria-hidden='true'
					className={cn(
						"flex size-4 shrink-0 items-center justify-center rounded-lg border border-input transition-colors",
						checked ? "border-primary bg-primary text-primary-foreground" : "bg-background"
					)}
				>
					{checked ? <CheckIcon className='size-3' /> : null}
				</span>
			)}
			<span className='min-w-0 flex-1 truncate'>{children}</span>
		</button>
	);
};

type DrawerMenuRadioGroupContextValue = {
	onValueChange?: (value: string) => void;
	value?: string;
};

const DrawerMenuRadioGroupContext = createContext<DrawerMenuRadioGroupContextValue>({});

type DrawerMenuRadioGroupProps = ComponentProps<"div"> & {
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	value?: string;
};

const DrawerMenuRadioGroup = ({
	className,
	children,
	defaultValue,
	onValueChange,
	value: valueProp,
	...props
}: DrawerMenuRadioGroupProps) => {
	const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
	const value = valueProp ?? uncontrolledValue;
	const contextValue = useMemo<DrawerMenuRadioGroupContextValue>(
		() => ({
			value,
			onValueChange: (nextValue) => {
				if (valueProp === undefined) {
					setUncontrolledValue(nextValue);
				}

				onValueChange?.(nextValue);
			},
		}),
		[onValueChange, value, valueProp]
	);

	return (
		<DrawerMenuRadioGroupContext.Provider value={contextValue}>
			<div
				data-slot='drawer-menu-radio-group'
				role='radiogroup'
				className={cn("flex flex-col", className)}
				{...props}
			>
				{children}
			</div>
		</DrawerMenuRadioGroupContext.Provider>
	);
};

type DrawerMenuRadioItemProps = ComponentProps<"button"> & {
	value: string;
};

const DrawerMenuRadioItem = ({
	className,
	children,
	onClick,
	type = "button",
	value,
	...props
}: DrawerMenuRadioItemProps) => {
	const { onValueChange, value: selectedValue } = use(DrawerMenuRadioGroupContext);
	const checked = selectedValue === value;

	return (
		<button
			aria-checked={checked}
			data-slot='drawer-menu-radio-item'
			role='menuitemradio'
			type={type}
			className={cn(drawerMenuItemClassName, className)}
			onClick={(event) => {
				onValueChange?.(value);
				onClick?.(event);
			}}
			{...props}
		>
			<span
				aria-hidden='true'
				className={cn(
					"flex size-4 shrink-0 items-center justify-center rounded-full border border-input",
					checked ? "border-primary bg-primary text-primary-foreground" : "bg-background"
				)}
			>
				{checked ? <span className='size-1.5 rounded-full bg-current' /> : null}
			</span>
			<span className='min-w-0 flex-1 truncate'>{children}</span>
		</button>
	);
};

const DrawerContent = (props: DrawerPrimitive.Content.Props) => {
	return <DrawerPrimitive.Content data-slot='drawer-content-primitive' {...props} />;
};

export {
	Drawer,
	DrawerBackdrop,
	DrawerBackdrop as DrawerOverlay,
	DrawerBar,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerMenu,
	DrawerMenuCheckboxItem,
	DrawerMenuGroup,
	DrawerMenuGroupLabel,
	DrawerMenuItem,
	DrawerMenuRadioGroup,
	DrawerMenuRadioItem,
	DrawerMenuTrigger,
	DrawerPanel,
	DrawerPopup,
	DrawerPortal,
	DrawerTitle,
	DrawerTrigger,
	DrawerViewport,
};
