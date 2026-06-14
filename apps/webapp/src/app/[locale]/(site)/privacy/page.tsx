import { Link } from "@/i18n/navigation";
import { generateLocalizedStaticParams } from "@/i18n/routing";
import { cn } from "@webld/ui/lib/utils";

import { Footer } from "../components/sections/footer";
import { Navbar } from "../components/sections/navbar";

export const generateStaticParams = generateLocalizedStaticParams;

export default function PrivacyPage() {
	return (
		<div className='bg-olive-50'>
			<Navbar />
			<main className='isolate overflow-clip'>
				<section className={cn("py-16")}>
					<div className='mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 sm:gap-16 md:max-w-3xl lg:max-w-7xl lg:px-10'>
						<div className='flex flex-col items-center gap-6'>
							<h1 className='max-w-5xl text-center font-display text-5xl tracking-tight text-olive-950 text-pretty sm:text-7xl'>
								Privacy Policy
							</h1>
							<p className='flex max-w-xl flex-col gap-4 text-center text-lg text-olive-700'>
								Last updated: January 1, 2026
							</p>
						</div>
						<div
							className={cn(
								"space-y-4 text-sm leading-7 text-olive-700",
								"[&_a]:font-semibold [&_a]:text-olive-950 [&_a]:underline [&_a]:underline-offset-4",
								"[&_h2]:text-base leading-8 [&_h2]:font-medium [&_h2]:text-olive-950 [&_h2]:not-first:mt-8",
								"[&_li]:ps-2 [&_ol]:list-decimal [&_ol]:ps-6",
								"[&_strong]:font-semibold [&_strong]:text-olive-950",
								"[&_ul]:list-[square] [&_ul]:ps-6 [&_ul]:marker:text-olive-400",
								"mx-auto max-w-2xl"
							)}
						>
							<p>
								This Privacy Policy describes how Oatmeal, Inc. (&quot;we,&quot; &quot;us,&quot; or
								&quot;our&quot;) collects, uses, and shares information about you when you use our
								websites, applications, and other online products and services (collectively, the
								&quot;Services&quot;) or when you otherwise interact with us.
							</p>

							<h2>Information We Collect</h2>
							<p>We collect information you provide directly to us, such as when you:</p>
							<ul>
								<li>Create an account or fill out a form</li>
								<li>Make a purchase or subscription</li>
								<li>Communicate with us via email, chat, or other channels</li>
								<li>Participate in surveys, promotions, or other interactive features</li>
								<li>Request customer support or otherwise communicate with us</li>
							</ul>

							<p>
								The types of information we may collect include your name, email address, postal
								address, phone number, payment information, and any other information you choose to
								provide.
							</p>

							<h2>Information We Collect Automatically</h2>
							<p>
								When you access or use our Services, we automatically collect certain information,
								including:
							</p>
							<ul>
								<li>
									<strong>Log Information:</strong> We collect information about your use of the
									Services, including the type of browser you use, access times, pages viewed, your IP
									address, and the page you visited before navigating to our Services.
								</li>
								<li>
									<strong>Device Information:</strong> We collect information about the computer or
									mobile device you use to access our Services, including the hardware model,
									operating system and version, unique device identifiers, and mobile network
									information.
								</li>
								<li>
									<strong>Location Information:</strong> We may collect information about the location
									of your device based on your IP address or, with your consent, more precise location
									information from your mobile device.
								</li>
							</ul>

							<h2>Use of Information</h2>
							<p>We use the information we collect to:</p>
							<ul>
								<li>Provide, maintain, and improve our Services</li>
								<li>Process transactions and send you related information</li>
								<li>Send you technical notices, updates, security alerts, and support messages</li>
								<li>Respond to your comments, questions, and requests</li>
								<li>Communicate with you about products, services, offers, and events</li>
								<li>
									Monitor and analyze trends, usage, and activities in connection with our Services
								</li>
								<li>
									Detect, investigate, and prevent fraudulent transactions and other illegal
									activities
								</li>
								<li>Personalize and improve the Services</li>
							</ul>

							<h2>Sharing of Information</h2>
							<p>
								We may share information about you as follows or as otherwise described in this Privacy
								Policy:
							</p>
							<ul>
								<li>
									With vendors, consultants, and other service providers who need access to such
									information to carry out work on our behalf
								</li>
								<li>
									In response to a request for information if we believe disclosure is in accordance
									with, or required by, any applicable law, regulation, or legal process
								</li>
								<li>
									If we believe your actions are inconsistent with our user agreements or policies, or
									to protect the rights, property, and safety of us or others
								</li>
								<li>
									In connection with, or during negotiations of, any merger, sale of company assets,
									financing, or acquisition of all or a portion of our business by another company
								</li>
								<li>With your consent or at your direction</li>
							</ul>

							<h2>Data Retention</h2>
							<p>
								We retain personal information for as long as necessary to fulfill the purposes for
								which it was collected, including to satisfy any legal, accounting, or reporting
								requirements. To determine the appropriate retention period, we consider the amount,
								nature, and sensitivity of the information, the potential risk of harm from unauthorized
								use or disclosure, and applicable legal requirements.
							</p>

							<h2>Your Rights and Choices</h2>
							<p>
								You have the right to access, correct, or delete your personal information. You may also
								have the right to restrict or object to certain processing of your information. To
								exercise these rights, please contact us using the information provided below.
							</p>
							<p>
								You may opt out of receiving promotional communications from us by following the
								instructions in those messages. If you opt out, we may still send you non-promotional
								communications, such as those about your account or our ongoing business relations.
							</p>

							<h2>Cookies and Tracking Technologies</h2>
							<p>
								We use cookies and similar tracking technologies to collect information about your
								browsing activities and to distinguish you from other users of our Services. This aids
								your experience when you browse our Services and also allows us to improve our site.
								Most web browsers are set to accept cookies by default. You can usually choose to set
								your browser to remove or reject browser cookies, but this may affect your ability to
								use certain features of our Services.
							</p>

							<h2>Security</h2>
							<p>
								We take reasonable measures to help protect information about you from loss, theft,
								misuse, and unauthorized access, disclosure, alteration, and destruction. However, no
								internet or email transmission is ever fully secure or error-free.
							</p>

							<h2>Children&apos;s Privacy</h2>
							<p>
								Our Services are not directed to children under 16, and we do not knowingly collect
								personal information from children under 16. If we learn that we have collected personal
								information from a child under 16, we will take steps to delete such information.
							</p>

							<h2>International Data Transfers</h2>
							<p>
								Your information may be transferred to, and maintained on, computers located outside of
								your state, province, country, or other governmental jurisdiction where the data
								protection laws may differ from those in your jurisdiction. If you are located outside
								the United States and choose to provide information to us, please note that we transfer
								the information to the United States and process it there.
							</p>

							<h2>Changes to This Policy</h2>
							<p>
								We may change this Privacy Policy from time to time. If we make changes, we will notify
								you by revising the date at the top of the policy and, in some cases, we may provide you
								with additional notice (such as adding a statement to our homepage or sending you a
								notification).
							</p>

							<h2>Contact Us</h2>
							<p>
								If you have any questions about this Privacy Policy, please contact us at{" "}
								<Link href='mailto:privacy@oatmeal.com'>privacy@oatmeal.com</Link>.
							</p>
						</div>
					</div>
				</section>
			</main>
			<Footer />
		</div>
	);
}
