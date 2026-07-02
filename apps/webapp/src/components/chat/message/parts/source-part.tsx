"use client";

import { ExternalLinkIcon, LinkIcon } from "lucide-react";

import { cn } from "@webld/ui/lib/utils";
import { url as urlUtils } from "@webld/utils";

export type SourcePartProps = {
	url: string;
	title?: string;
};

export const SourcePart = ({ url, title }: SourcePartProps) => {
	const displayTitle = title || urlUtils.getHostnameFromUrl({ url });

	return (
		<a
			href={url}
			target='_blank'
			rel='noopener noreferrer'
			className={cn(
				"group inline-flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm transition-colors",
				"hover:border-border hover:bg-muted/50",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			)}
		>
			<LinkIcon className='size-3.5 text-muted-foreground' />
			<span className='max-w-50 truncate text-foreground'>{displayTitle}</span>
			<ExternalLinkIcon className='size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100' />
		</a>
	);
};

SourcePart.displayName = "SourcePart";

// Container for multiple sources
export type SourcesContainerProps = {
	sources: Array<{ url: string; title?: string }>;
};

export const SourcesContainer = ({ sources }: SourcesContainerProps) => {
	if (!sources || sources.length === 0) {
		return null;
	}

	return (
		<div className='flex flex-wrap gap-2'>
			{sources.map((source, index) => (
				<SourcePart key={`${source.url}-${index}`} url={source.url} title={source.title} />
			))}
		</div>
	);
};

SourcesContainer.displayName = "SourcesContainer";
