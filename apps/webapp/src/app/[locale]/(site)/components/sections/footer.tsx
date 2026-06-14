import type { ComponentProps } from "react";

import type { Route } from "next";
import Link from "next/link";

import { ArrowRight } from "lucide-react";
import { siGithub, siX, siYoutube } from "simple-icons";

import { cn } from "@webld/ui/lib/utils";

const footerLinks = [
	{
		title: "Product",
		links: [
			{ label: "Features", href: "#features" },
			{ label: "Pricing", href: "#pricing" },
			{ label: "Integrations", href: "#" },
			{ label: "Changelog", href: "#" },
		],
	},
	{
		title: "Company",
		links: [
			{ label: "About", href: "#" },
			{ label: "Blog", href: "#" },
			{ label: "Careers", href: "#" },
			{ label: "Press", href: "#" },
		],
	},
	{
		title: "Resources",
		links: [
			{ label: "Documentation", href: "#" },
			{ label: "Help Center", href: "#" },
			{ label: "Community", href: "#" },
			{ label: "Contact", href: "#" },
		],
	},
	{
		title: "Legal",
		links: [
			{ label: "Privacy", href: "/privacy" },
			{ label: "Terms", href: "#" },
			{ label: "Cookie Policy", href: "#" },
		],
	},
];

const socialLinks = [
	{ name: "X", href: "https://x.com", icon: siX },
	{ name: "GitHub", href: "https://github.com", icon: siGithub },
	{ name: "YouTube", href: "https://youtube.com", icon: siYoutube },
];

export const Footer = async ({ className, ...props }: ComponentProps<"footer">) => {
	"use cache";

	return (
		<footer className={cn("pt-16 bg-olive-950/2.5 py-16 text-olive-950", className)} {...props}>
			<div className='mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10 flex flex-col gap-16'>
				<div className='grid grid-cols-1 gap-x-6 gap-y-16 text-sm lg:grid-cols-2'>
					{/* Newsletter Form */}
					<form className='flex max-w-sm flex-col gap-2'>
						<p className='font-medium text-olive-950'>Subscribe to our newsletter</p>
						<div className='flex flex-col gap-4 text-sm text-olive-700'>
							<p>Get the latest news and updates delivered to your inbox.</p>
						</div>
						<div className='mt-2 flex items-center border-b border-olive-950/20 py-2 has-[input:focus]:border-olive-950'>
							<input
								type='email'
								placeholder='Email'
								aria-label='Email'
								className='flex-1 bg-transparent text-olive-950 focus:outline-hidden'
							/>
							<button
								type='submit'
								aria-label='Subscribe'
								className='relative inline-flex size-7 items-center justify-center rounded-full after:absolute after:-inset-2 hover:bg-olive-950/10'
							>
								<ArrowRight className='size-4' strokeWidth={1.5} />
							</button>
						</div>
					</form>

					{/* Navigation Links */}
					<nav className='grid grid-cols-2 gap-6 sm:has-[>:last-child:nth-child(3)]:grid-cols-3 sm:has-[>:nth-child(5)]:grid-cols-3 md:has-[>:last-child:nth-child(4)]:grid-cols-4 lg:max-xl:has-[>:last-child:nth-child(4)]:grid-cols-2'>
						{footerLinks.map((category) => (
							<div key={category.title}>
								<h3 className='font-medium text-olive-950'>{category.title}</h3>
								<ul role='list' className='mt-2 flex flex-col gap-2'>
									{category.links.map((link) => (
										<li key={link.label} className='text-olive-700'>
											<Link href={link.href as Route}>{link.label}</Link>
										</li>
									))}
								</ul>
							</div>
						))}
					</nav>
				</div>
				<div className='flex items-center justify-between gap-10 text-sm'>
					<div className='text-olive-600'>
						<p>© {new Date().getFullYear()} Oatmeal, Inc. All rights reserved.</p>
					</div>
					<div className='flex items-center gap-4 sm:gap-10'>
						{socialLinks.map((social) => (
							<a
								key={social.name}
								href={social.href}
								target='_blank'
								rel='noopener noreferrer'
								aria-label={social.name}
								className='text-olive-950 *:size-6'
							>
								<svg viewBox='0 0 24 24' fill='currentColor'>
									<path d={social.icon.path} />
								</svg>
							</a>
						))}
					</div>
				</div>
			</div>
		</footer>
	);
};
