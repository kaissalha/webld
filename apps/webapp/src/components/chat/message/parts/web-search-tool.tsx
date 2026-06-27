"use client";

import { ExternalLinkIcon, SearchIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Skeleton } from "@webld/ui/components/skeleton";
import { TextShimmer } from "@webld/ui/components/text-shimmer";

import { ChatStepItem } from "../chat-step-item";
import type { ToolState } from "./tool-part-types";

type ExaSearchResult = {
	url: string;
	title?: string;
	publishedDate?: string | null;
	author?: string | null;
	favicon?: string | null;
	text?: string;
	summary?: string;
	highlights?: string[];
};

type ExaSearchOutput = {
	results?: ExaSearchResult[];
	error?: string;
	message?: string;
};

const SKELETON_KEYS = ["row-1", "row-2", "row-3"];

const searchIcon = <SearchIcon className='size-3.5' />;

const getHostname = (url: string) => {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
};

const formatPublishedDate = ({ value, locale }: { value?: string | null; locale: string }) => {
	if (!value) {
		return null;
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return null;
	}

	return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(date);
};

const SearchSource = ({ result }: { result: ExaSearchResult }) => {
	const locale = useLocale();
	const hostname = getHostname(result.url);
	const snippet = result.summary || result.highlights?.[0] || result.text;
	const faviconUrl = result.favicon || `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
	const publishedLabel = formatPublishedDate({ locale, value: result.publishedDate });

	return (
		<a
			href={result.url}
			target='_blank'
			rel='noopener noreferrer'
			className='group flex gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50'
		>
			{/* oxlint-disable-next-line nextjs/no-img-element */}
			<img
				src={faviconUrl}
				alt=''
				width={16}
				height={16}
				loading='lazy'
				referrerPolicy='no-referrer'
				className='mt-0.5 size-4 shrink-0 rounded-sm object-contain'
			/>
			<div className='min-w-0 flex-1'>
				<div className='flex items-center gap-1.5'>
					<span className='truncate text-sm font-medium text-foreground'>{result.title || hostname}</span>
					<ExternalLinkIcon className='size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100' />
				</div>
				<div className='mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground'>
					<span className='truncate'>{hostname}</span>
					{publishedLabel && (
						<>
							<span aria-hidden className='size-0.5 shrink-0 rounded-full bg-muted-foreground/40' />
							<span className='shrink-0'>{publishedLabel}</span>
						</>
					)}
				</div>
				{snippet && <p className='mt-1 line-clamp-2 text-xs text-muted-foreground/80'>{snippet}</p>}
			</div>
		</a>
	);
};

export type WebSearchToolProps = {
	state: ToolState;
	input?: Record<string, unknown>;
	output?: unknown;
	errorText?: string;
	isLast?: boolean;
};

export const WebSearchTool = ({ state, input, output, errorText, isLast = false }: WebSearchToolProps) => {
	const t = useTranslations("components.chat.message.tool");
	const query = typeof input?.query === "string" ? input.query : undefined;

	if (state === "output-error") {
		return (
			<ChatStepItem icon={searchIcon} status='error' isLast={isLast} label={errorText || t("webSearch.error")} />
		);
	}

	if (state === "input-streaming" || state === "input-available") {
		return (
			<ChatStepItem
				icon={searchIcon}
				status='running'
				isLast={isLast}
				defaultOpen
				label={<TextShimmer className='font-medium'>{t("webSearch.searching")}</TextShimmer>}
			>
				<div className='space-y-1.5 pt-1'>
					{query && (
						<span className='inline-flex max-w-full items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-xs text-foreground'>
							<SearchIcon className='size-3 shrink-0' />
							<span className='truncate'>{query}</span>
						</span>
					)}
					{SKELETON_KEYS.map((rowKey) => (
						<div key={rowKey} className='flex items-start gap-2.5 px-2 py-0.5'>
							<Skeleton className='mt-0.5 size-4 shrink-0 rounded-sm' />
							<div className='flex-1 space-y-1.5'>
								<Skeleton className='h-3 w-3/4' />
								<Skeleton className='h-2.5 w-1/2' />
							</div>
						</div>
					))}
				</div>
			</ChatStepItem>
		);
	}

	const data = output as ExaSearchOutput | undefined;

	if (data?.error) {
		return (
			<ChatStepItem
				icon={searchIcon}
				status='error'
				isLast={isLast}
				label={data.message ?? errorText ?? t("webSearch.error")}
			/>
		);
	}

	const seenUrls = new Set<string>();
	const results = (data?.results ?? []).filter((result) => {
		if (!result.url || seenUrls.has(result.url)) {
			return false;
		}

		seenUrls.add(result.url);
		return true;
	});

	if (results.length === 0) {
		return <ChatStepItem icon={searchIcon} status='done' isLast={isLast} label={t("webSearch.noResults")} />;
	}

	return (
		<ChatStepItem
			icon={searchIcon}
			status='done'
			isLast={isLast}
			label={t("webSearch.sources", { count: results.length })}
		>
			<div className='pt-1'>
				{results.map((result) => (
					<SearchSource key={result.url} result={result} />
				))}
			</div>
		</ChatStepItem>
	);
};

WebSearchTool.displayName = "WebSearchTool";
