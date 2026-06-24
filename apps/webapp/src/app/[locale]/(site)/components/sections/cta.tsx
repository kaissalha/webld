import type { ComponentProps } from "react";

import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Button } from "@webld/ui/components/button";
import { cn } from "@webld/ui/lib/utils";

export const CTA = async ({ className, ...props }: ComponentProps<"section">) => {
	const t = await getTranslations("site.cta");

	return (
		<section
			id='call-to-action'
			className={cn(
				"py-16 mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10 flex flex-col items-start gap-10",
				className
			)}
			{...props}
		>
			<h2 className='font-display text-3xl tracking-tight text-pretty text-olive-950 sm:text-5xl'>
				{t("title")}
			</h2>
			<div className='text-base text-olive-700 text-pretty max-w-2xl'>
				<p>{t("description")}</p>
			</div>
			<div className='flex items-center gap-4'>
				<Button size='lg' asChild>
					<Link href='#'>{t("startTrial")}</Link>
				</Button>

				<Button variant='ghost' size='lg' asChild>
					<Link href='#'>
						{t("contactSales")} <ArrowRight className='size-4 rtl:rotate-180' strokeWidth={1.5} />
					</Link>
				</Button>
			</div>
		</section>
	);
};
