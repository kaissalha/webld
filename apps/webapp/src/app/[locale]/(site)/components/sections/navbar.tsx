"use client";

import type { ComponentProps } from "react";
import { useState } from "react";

import type { Route } from "next";
import Link from "next/link";

import { Menu, X } from "lucide-react";

import { Logo } from "@/components/logo";
import { authClient } from "@/lib/auth-client";
import { Button } from "@webld/ui/components/button";
import { cn } from "@webld/ui/lib/utils";

const NavbarLink = ({
	children,
	href,
	className,
	...props
}: { href: Route } & Omit<ComponentProps<typeof Link>, "href">) => {
	return (
		<Link
			href={href}
			className={cn("text-sm text-olive-700 transition-colors hover:text-olive-950", className)}
			{...props}
		>
			{children}
		</Link>
	);
};

const navLinks = [
	{ href: "#features" as Route, label: "Features" },
	{ href: "#pricing" as Route, label: "Pricing" },
	{ href: "#testimonials" as Route, label: "Testimonials" },
	{ href: "#faqs" as Route, label: "FAQ" },
];

export const Navbar = ({ className, ...props }: ComponentProps<"header">) => {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const { data: session, isPending } = authClient.useSession();

	const continueHref = session ? ("/dashboard" as Route) : ("/login" as Route);

	return (
		<>
			<header className={cn("sticky top-0 z-10 backdrop-blur-sm bg-olive-50/70", className)} {...props}>
				<nav className='mx-auto flex h-14 max-w-7xl items-center justify-between px-6 lg:px-10'>
					{/* Logo on left */}
					<Link href={"/" as Route} className='flex items-center'>
						<Logo className='size-8' />
					</Link>

					{/* Links and actions on right */}
					<div className='flex items-center gap-8'>
						<div className='hidden items-center gap-6 lg:flex'>
							{navLinks.map((link) => (
								<NavbarLink key={link.href} href={link.href}>
									{link.label}
								</NavbarLink>
							))}
						</div>
						<div className='hidden items-center lg:flex'>
							<Button size='sm' asChild>
								<Link href={continueHref}>Continue</Link>
							</Button>
						</div>

						{/* Mobile menu button */}
						<button
							type='button'
							onClick={() => setMobileMenuOpen(true)}
							aria-label='Open menu'
							className='inline-flex rounded-md p-1.5 text-olive-700 hover:bg-olive-100 lg:hidden'
						>
							<Menu className='size-5' />
						</button>
					</div>
				</nav>
			</header>

			{/* Mobile Menu - outside header to avoid stacking context issues */}
			{mobileMenuOpen && (
				<div className='fixed inset-0 z-50 bg-background lg:hidden'>
					<div className='mx-auto max-w-7xl px-6 py-3'>
						<div className='flex items-center justify-between'>
							<Link href={"/" as Route} className='flex items-center'>
								<Logo className='size-8' />
							</Link>
							<button
								type='button'
								onClick={() => setMobileMenuOpen(false)}
								aria-label='Close menu'
								className='inline-flex rounded-md p-1.5 text-olive-700 hover:bg-olive-100'
							>
								<X className='size-5' />
							</button>
						</div>
						<div className='mt-8 flex flex-col gap-7'>
							{navLinks.map((link) => (
								<NavbarLink key={link.href} href={link.href} className='text-3xl font-medium'>
									{link.label}
								</NavbarLink>
							))}
						</div>
						<div className='mt-10'>
							<Button size='lg' loading={isPending} asChild>
								<Link href={continueHref}>Continue</Link>
							</Button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};
