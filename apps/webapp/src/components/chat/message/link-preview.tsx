"use client";

import { useCallback, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { useTRPC } from "@/lib/trpc";
import { getInitials } from "@/utils/string";
import { PreviewCard, PreviewCardPopup, PreviewCardTrigger } from "@starter/ui/components/preview-card";
import { cn } from "@starter/ui/lib/utils";

const baseLinkStyles = "truncate rounded-xl bg-muted/50 px-2 py-1 text-xs text-muted-foreground transition-colors";

type LinkPreviewProps = {
	url: string;
	children: React.ReactNode;
	className?: string;
	onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

export const LinkPreview = ({ url, children, className, onClick }: LinkPreviewProps) => {
	const t = useTranslations("components.chat.message.linkPreview");
	const trpc = useTRPC();
	const [shouldLoadMetadata, setShouldLoadMetadata] = useState(false);
	const loadMetadata = useCallback(() => {
		setShouldLoadMetadata(true);
	}, []);

	const { data: metadata, isLoading } = useQuery(
		trpc.chat.getUrlMetadata.queryOptions(
			{ url },
			{
				staleTime: 20 * 60 * 1000,
				enabled: shouldLoadMetadata,
			}
		)
	);

	return (
		<PreviewCard>
			<PreviewCardTrigger
				className={cn(
					baseLinkStyles,
					"hover:bg-muted hover:text-foreground data-[popup-open]:bg-muted data-[popup-open]:text-foreground",
					className
				)}
				closeDelay={300}
				delay={150}
				href={url}
				onClick={onClick}
				onFocus={loadMetadata}
				onMouseEnter={loadMetadata}
				rel='noopener noreferrer'
				target='_blank'
			>
				{children}
			</PreviewCardTrigger>

			<PreviewCardPopup
				align='start'
				className='min-w-80 max-w-96 py-3'
				collisionPadding={16}
				side='top'
				sideOffset={8}
				suppressHydrationWarning={true}
			>
				{!shouldLoadMetadata || isLoading ? (
					<div className='space-y-2'>
						<div className='h-3 w-24 animate-pulse rounded bg-muted' />
						<div className='h-4 w-full animate-pulse rounded bg-muted' />
						<div className='h-4 w-3/4 animate-pulse rounded bg-muted' />
					</div>
				) : metadata ? (
					<a href={url} rel='noopener noreferrer' target='_blank'>
						<div className='mb-2 flex items-center gap-1'>
							{metadata.favicon ? (
								// oxlint-disable-next-line nextjs/no-img-element
								<img
									alt={t("faviconAlt", { siteName: metadata.siteName })}
									className='size-4 shrink-0 rounded-md'
									src={metadata.favicon}
									onError={(event: React.SyntheticEvent<HTMLImageElement>) => {
										event.currentTarget.style.display = "none";
									}}
								/>
							) : (
								<div className='flex size-4 shrink-0 items-center justify-center rounded-md bg-muted'>
									<span className='text-xs font-bold text-foreground'>
										{getInitials({ name: metadata.siteName, length: 1 }) ?? "·"}
									</span>
								</div>
							)}
							<span className='truncate text-xs font-medium text-foreground'>{metadata.siteName}</span>
						</div>

						<p className='line-clamp-2 text-sm font-medium text-foreground'>{metadata.title}</p>

						{metadata.description ? (
							<p className='mt-1 line-clamp-3 text-sm text-muted-foreground'>{metadata.description}</p>
						) : null}
					</a>
				) : null}
			</PreviewCardPopup>
		</PreviewCard>
	);
};
