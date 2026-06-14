import * as React from "react";

import { cn } from "@starter/ui/lib/utils";

import { useIsMobile } from "../hooks/use-mobile";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogTitle,
	DialogTrigger,
} from "./dialog";
import {
	Drawer,
	DrawerClose,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerOverlay,
	DrawerPanel,
	DrawerPopup,
	DrawerTitle,
	DrawerTrigger,
} from "./drawer";

type BaseProps = {
	className?: string;
	children?: React.ReactNode;
	asChild?: boolean;
};

type CredenzaCloseProps = BaseProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

type RootCredenzaProps = {
	type?: "dialog" | "drawer";
	side?: "top" | "bottom" | "left" | "right";
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
} & BaseProps;

type CredenzaProps = BaseProps & {
	showClose?: boolean;
	autoFocus?: boolean;
	noOverlay?: boolean;
	stackable?: boolean;
	handleClassName?: string;
	side?: "top" | "bottom" | "left" | "right";
};

type CredenzaContextValue = {
	resolved: "drawer" | "dialog";
	isMobile: boolean;
};

const CredenzaContext = React.createContext<CredenzaContextValue>({
	resolved: "dialog",
	isMobile: false,
});

const useCredenzaContext = () => React.useContext(CredenzaContext);

const Credenza = ({ children, type = "dialog", side = "right", ...props }: RootCredenzaProps) => {
	const isMobile = useIsMobile();
	const useDrawer = isMobile || type === "drawer";

	if (useDrawer) {
		const position = isMobile ? "bottom" : side;
		return (
			<CredenzaContext.Provider value={{ resolved: "drawer", isMobile }}>
				<Drawer position={position} {...props}>
					{children}
				</Drawer>
			</CredenzaContext.Provider>
		);
	}

	return (
		<CredenzaContext.Provider value={{ resolved: "dialog", isMobile }}>
			<Dialog {...props}>{children}</Dialog>
		</CredenzaContext.Provider>
	);
};

const CredenzaTrigger = ({ className, children, ...props }: BaseProps) => {
	const { resolved } = useCredenzaContext();

	if (resolved === "drawer") {
		return (
			<DrawerTrigger className={className} {...props}>
				{children}
			</DrawerTrigger>
		);
	}

	return (
		<DialogTrigger className={className} {...props}>
			{children}
		</DialogTrigger>
	);
};

const CredenzaClose = ({ className, children, ...props }: CredenzaCloseProps) => {
	const { resolved } = useCredenzaContext();

	if (resolved === "drawer") {
		return (
			<DrawerClose className={className} {...props}>
				{children}
			</DrawerClose>
		);
	}

	return (
		<DialogClose className={className} {...props}>
			{children}
		</DialogClose>
	);
};

const CredenzaContent = ({ className, children, stackable = true, ...props }: CredenzaProps) => {
	const { resolved, isMobile } = useCredenzaContext();

	if (resolved === "drawer") {
		return (
			<DrawerPopup
				variant={isMobile ? "default" : "inset"}
				className={className}
				data-stackable={stackable}
				{...props}
			>
				{children}
			</DrawerPopup>
		);
	}

	return (
		<DialogContent className={className} data-stackable={stackable} {...props}>
			{children}
		</DialogContent>
	);
};

const CredenzaDescription = ({ className, children, ...props }: BaseProps) => {
	const { resolved } = useCredenzaContext();

	if (resolved === "drawer") {
		return (
			<DrawerDescription className={className} {...props}>
				{children}
			</DrawerDescription>
		);
	}

	return (
		<DialogDescription className={className} {...props}>
			{children}
		</DialogDescription>
	);
};

const CredenzaHeader = ({ className, children, ...props }: BaseProps) => {
	const { resolved } = useCredenzaContext();

	if (resolved === "drawer") {
		return (
			<DrawerHeader className={className} {...props}>
				{children}
			</DrawerHeader>
		);
	}

	return (
		<DialogHeader className={className} {...props}>
			{children}
		</DialogHeader>
	);
};

const CredenzaTitle = ({ className, children, ...props }: BaseProps) => {
	const { resolved } = useCredenzaContext();

	if (resolved === "drawer") {
		return (
			<DrawerTitle className={className} {...props}>
				{children}
			</DrawerTitle>
		);
	}

	return (
		<DialogTitle className={className} {...props}>
			{children}
		</DialogTitle>
	);
};

const CredenzaOverlay = ({ className }: { className?: string }) => {
	const { resolved } = useCredenzaContext();

	if (resolved === "drawer") {
		return <DrawerOverlay className={className} />;
	}

	return <DialogOverlay className={className} />;
};

const CredenzaBody = ({ className, children, scrollable, ...props }: BaseProps & { scrollable?: boolean }) => {
	const { isMobile, resolved } = useCredenzaContext();

	if (resolved === "drawer") {
		return (
			<DrawerPanel
				scrollable={scrollable ?? true}
				className={cn(isMobile ? "px-4" : "px-0", className)}
				{...props}
			>
				{children}
			</DrawerPanel>
		);
	}

	return (
		<div className={cn(isMobile ? "px-4" : "px-0", className)} {...props}>
			{children}
		</div>
	);
};

const CredenzaFooter = ({ className, children, ...props }: BaseProps) => {
	const { resolved } = useCredenzaContext();

	if (resolved === "drawer") {
		return (
			<DrawerFooter className={className} {...props}>
				{children}
			</DrawerFooter>
		);
	}

	return (
		<DialogFooter className={className} {...props}>
			{children}
		</DialogFooter>
	);
};

// Keep portal export for API compat — no-op since Drawer/Dialog handle portaling internally
const CredenzaPortal = ({ children }: BaseProps) => <>{children}</>;

export {
	Credenza,
	CredenzaPortal,
	CredenzaTrigger,
	CredenzaClose,
	CredenzaContent,
	CredenzaDescription,
	CredenzaHeader,
	CredenzaTitle,
	CredenzaBody,
	CredenzaFooter,
	CredenzaOverlay,
};
