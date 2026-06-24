import { getMessages, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { generateLocalizedStaticParams } from "@/i18n/routing";
import { cn } from "@webld/ui/lib/utils";

import { Footer } from "../components/sections/footer";
import { Navbar } from "../components/sections/navbar";

export const generateStaticParams = generateLocalizedStaticParams;

const automaticItemIds = ["log", "device", "location"] as const;

export default async function PrivacyPage() {
	const [t, messages] = await Promise.all([getTranslations("privacy"), getMessages()]);
	const privacy = messages.privacy;

	return (
		<div className='bg-olive-50'>
			<Navbar />
			<main className='isolate overflow-clip'>
				<section className={cn("py-16")}>
					<div className='mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 sm:gap-16 md:max-w-3xl lg:max-w-7xl lg:px-10'>
						<div className='flex flex-col items-center gap-6'>
							<h1 className='max-w-5xl text-center font-display text-5xl tracking-tight text-olive-950 text-pretty sm:text-7xl'>
								{t("title")}
							</h1>
							<p className='flex max-w-xl flex-col gap-4 text-center text-lg text-olive-700'>
								{t("lastUpdated")}
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
							<p>{t("intro")}</p>

							<h2>{t("collect.heading")}</h2>
							<p>{t("collect.intro")}</p>
							<ul>
								{Object.values(privacy.collect.items).map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
							<p>{t("collect.outro")}</p>

							<h2>{t("collectAutomatically.heading")}</h2>
							<p>{t("collectAutomatically.intro")}</p>
							<ul>
								{automaticItemIds.map((id) => (
									<li key={id}>
										<strong>{t(`collectAutomatically.items.${id}.label`)}</strong>{" "}
										{t(`collectAutomatically.items.${id}.text`)}
									</li>
								))}
							</ul>

							<h2>{t("use.heading")}</h2>
							<p>{t("use.intro")}</p>
							<ul>
								{Object.values(privacy.use.items).map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>

							<h2>{t("sharing.heading")}</h2>
							<p>{t("sharing.intro")}</p>
							<ul>
								{Object.values(privacy.sharing.items).map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>

							<h2>{t("retention.heading")}</h2>
							<p>{t("retention.body")}</p>

							<h2>{t("rights.heading")}</h2>
							<p>{t("rights.body1")}</p>
							<p>{t("rights.body2")}</p>

							<h2>{t("cookies.heading")}</h2>
							<p>{t("cookies.body")}</p>

							<h2>{t("security.heading")}</h2>
							<p>{t("security.body")}</p>

							<h2>{t("children.heading")}</h2>
							<p>{t("children.body")}</p>

							<h2>{t("international.heading")}</h2>
							<p>{t("international.body")}</p>

							<h2>{t("changes.heading")}</h2>
							<p>{t("changes.body")}</p>

							<h2>{t("contact.heading")}</h2>
							<p>
								{t("contact.body")} <Link href='mailto:privacy@oatmeal.com'>{t("contact.email")}</Link>.
							</p>
						</div>
					</div>
				</section>
			</main>
			<Footer />
		</div>
	);
}
