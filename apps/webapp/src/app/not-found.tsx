import type { Route } from "next";
import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { Footer } from "@/app/[locale]/(site)/components/sections/footer";
import { Navbar } from "@/app/[locale]/(site)/components/sections/navbar";
import { BaseLayout } from "@/components/layout/base-layout";
import messages from "@/i18n/messages/en.json";
import { routing } from "@/i18n/routing";
import "@starter/ui/globals.css";

export default function NotFound() {
	return (
		<BaseLayout locale={routing.defaultLocale} messages={messages}>
			<Navbar />
			<section className='flex flex-1 flex-col items-center justify-center py-16 mx-auto w-full max-w-2xl gap-6 px-6 md:max-w-3xl lg:max-w-7xl lg:px-10'>
				<h1 className='max-w-5xl text-center font-display text-8xl tracking-tight text-balance text-olive-950'>
					Page not found
				</h1>
				<p className='flex max-w-xl flex-col gap-4 text-center text-lg text-olive-700'>
					Sorry, but the page you were looking for could not be found.
				</p>
				<Link
					href={"/" as Route}
					className='inline-flex items-center gap-2 text-sm font-medium text-olive-950 transition-opacity hover:opacity-70'
				>
					Go back home
					<ArrowRight className='size-3.5' strokeWidth={1.5} />
				</Link>
			</section>
			<Footer />
		</BaseLayout>
	);
}
