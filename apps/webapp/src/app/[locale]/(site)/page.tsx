import type { Metadata } from "next";

import { generateLocalizedMetadata } from "@/i18n/routing";

import { CTA } from "./components/sections/cta";
import { Faqs } from "./components/sections/faqs";
import { Features } from "./components/sections/features";
import { Footer } from "./components/sections/footer";
import { Hero } from "./components/sections/hero";
import { Navbar } from "./components/sections/navbar";
import { Pricing } from "./components/sections/pricing";
import { Stats } from "./components/sections/stats";
import { Testimonials } from "./components/sections/testimonials";

export const generateMetadata = (): Metadata => generateLocalizedMetadata("/");

export default async function Home() {
	return (
		<div className='bg-olive-50'>
			<Navbar />
			<main className='max-w-dvw overflow-x-hidden'>
				<Hero />
				<Features />
				<Stats />
				<Testimonials />
				<Faqs />
				<Pricing />
				<CTA />
			</main>
			<Footer />
		</div>
	);
}
