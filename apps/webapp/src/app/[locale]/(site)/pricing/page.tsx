import { generateLocalizedStaticParams } from "@/i18n/routing";

import { Faqs } from "../components/sections/faqs";
import { Footer } from "../components/sections/footer";
import { Navbar } from "../components/sections/navbar";
import { PricingCta } from "./components/cta";
import { PricingHero } from "./components/hero";
import { PricingSection } from "./components/pricing-section";
import { PricingTestimonial } from "./components/testimonial";

export const generateStaticParams = generateLocalizedStaticParams;

export default function PricingPage() {
	return (
		<div className='bg-olive-50'>
			<Navbar />
			<main className='isolate overflow-clip'>
				<PricingHero />
				<PricingSection />
				<PricingTestimonial />
				<Faqs />
				<PricingCta />
			</main>
			<Footer />
		</div>
	);
}
