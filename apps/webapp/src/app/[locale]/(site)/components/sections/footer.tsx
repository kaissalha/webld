import type { ComponentProps } from "react";

import { cacheLife } from "next/cache";

import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { siGithub, siX, siYoutube } from "simple-icons";

import { Link } from "@/i18n/navigation";
import { cn } from "@webld/ui/lib/utils";

const footerSections = [
	{
		id: "product",
		links: [
			{ id: "features", href: "#features" },
			{ id: "pricing", href: "#pricing" },
			{ id: "integrations", href: "#" },
			{ id: "changelog", href: "#" },
		],
	},
	{
		id: "company",
		links: [
			{ id: "about", href: "#" },
			{ id: "blog", href: "#" },
			{ id: "careers", href: "#" },
			{ id: "press", href: "#" },
		],
	},
	{
		id: "resources",
		links: [
			{ id: "documentation", href: "#" },
			{ id: "helpCenter", href: "#" },
			{ id: "community", href: "#" },
			{ id: "contact", href: "#" },
		],
	},
	{
		id: "legal",
		links: [
			{ id: "privacy", href: "/privacy" },
			{ id: "terms", href: "#" },
			{ id: "cookiePolicy", href: "#" },
		],
	},
] as const;

const socialLinks = [
	{ name: "X", href: "https://x.com", icon: siX },
	{ name: "GitHub", href: "https://github.com", icon: siGithub },
	{ name: "YouTube", href: "https://youtube.com", icon: siYoutube },
];

const getCopyrightYear = async () => {
	"use cache";
	cacheLife("days");
	return new Date().getFullYear();
};

export const Footer = async ({ className, ...props }: ComponentProps<"footer">) => {
	const t = await getTranslations("site.footer");
	const year = await getCopyrightYear();

	return (
		<footer className={cn("pt-16 bg-olive-950/2.5 py-16 text-olive-950", className)} {...props}>
			<div className='mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10 flex flex-col gap-16'>
				<div className='grid grid-cols-1 gap-x-6 gap-y-16 text-sm lg:grid-cols-2'>
					{/* Newsletter Form */}
					<form className='flex max-w-sm flex-col gap-2'>
						<p className='font-medium text-olive-950'>{t("newsletter.title")}</p>
						<div className='flex flex-col gap-4 text-sm text-olive-700'>
							<p>{t("newsletter.description")}</p>
						</div>
						<div className='mt-2 flex items-center border-b border-olive-950/20 py-2 has-[input:focus]:border-olive-950'>
							<input
								type='email'
								placeholder={t("newsletter.emailPlaceholder")}
								aria-label={t("newsletter.emailLabel")}
								className='flex-1 bg-transparent text-olive-950 focus:outline-hidden'
							/>
							<button
								type='submit'
								aria-label={t("newsletter.subscribe")}
								className='relative inline-flex size-7 items-center justify-center rounded-full after:absolute after:-inset-2 hover:bg-olive-950/10'
							>
								<ArrowRight className='size-4 rtl:rotate-180' strokeWidth={1.5} />
							</button>
						</div>
					</form>

					{/* Navigation Links */}
					<nav className='grid grid-cols-2 gap-6 sm:has-[>:last-child:nth-child(3)]:grid-cols-3 sm:has-[>:nth-child(5)]:grid-cols-3 md:has-[>:last-child:nth-child(4)]:grid-cols-4 lg:max-xl:has-[>:last-child:nth-child(4)]:grid-cols-2'>
						{footerSections.map((section) => (
							<div key={section.id}>
								<h3 className='font-medium text-olive-950'>{t(`sections.${section.id}`)}</h3>
								<ul className='mt-2 flex flex-col gap-2'>
									{section.links.map((link) => (
										<li key={link.id} className='text-olive-700'>
											<Link href={link.href}>{t(`links.${link.id}`)}</Link>
										</li>
									))}
								</ul>
							</div>
						))}
					</nav>
				</div>
				<div className='flex items-center justify-between gap-10 text-sm'>
					<div className='text-olive-600'>
						<p>{t("copyright", { year })}</p>
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
