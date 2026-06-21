import { type Components, Streamdown } from "streamdown";

import { LinkPreview } from "./link-preview";

const normalizeExternalHref = (href: string) => (href.startsWith("http") ? href : `https://${href}`);

const components: Partial<Components> = {
	pre: ({ children }) => <>{children}</>,
	table: ({ children, ...props }) => {
		return (
			<div className='my-4 overflow-hidden rounded-2xl border border-border/50'>
				<table className='w-full border-collapse text-start' {...props}>
					{children}
				</table>
			</div>
		);
	},
	thead: ({ children, ...props }) => {
		return (
			<thead className='border-b border-border/50' {...props}>
				{children}
			</thead>
		);
	},
	tr: ({ children, ...props }) => {
		return (
			<tr className='border-b border-border/50 last:border-b-0' {...props}>
				{children}
			</tr>
		);
	},
	th: ({ children, ...props }) => {
		return (
			<th className='px-4 py-2 text-start align-top text-sm font-semibold' {...props}>
				{children}
			</th>
		);
	},
	td: ({ children, ...props }) => {
		return (
			<td className='px-4 py-2 align-top text-sm' {...props}>
				{children}
			</td>
		);
	},
	hr: ({ ...props }) => {
		return <hr className='my-6 border-border/50' {...props} />;
	},
	ol: ({ children, ...props }) => {
		return (
			<ol className='ms-4 list-outside list-decimal space-y-1 ps-1' {...props}>
				{children}
			</ol>
		);
	},
	li: ({ children, ...props }) => {
		return <li {...props}>{children}</li>;
	},
	ul: ({ children, ...props }) => {
		return (
			<ul className='ms-4 list-outside list-disc space-y-1 ps-1' {...props}>
				{children}
			</ul>
		);
	},
	strong: ({ children, ...props }) => {
		return (
			<span className='font-semibold' {...props}>
				{children}
			</span>
		);
	},
	a: ({ children, href }) => {
		if (!href || (!href.startsWith("http") && !href.startsWith("www"))) {
			return <>{children}</>;
		}

		return <LinkPreview url={normalizeExternalHref(href)}>{children}</LinkPreview>;
	},
	h1: ({ children, ...props }) => {
		return (
			<h1 className='mb-2 mt-6 text-3xl font-semibold' {...props}>
				{children}
			</h1>
		);
	},
	h2: ({ children, ...props }) => {
		return (
			<h2 className='mb-2 mt-6 text-2xl font-semibold' {...props}>
				{children}
			</h2>
		);
	},
	h3: ({ children, ...props }) => {
		return (
			<h3 className='mb-2 mt-6 text-xl font-semibold' {...props}>
				{children}
			</h3>
		);
	},
	h4: ({ children, ...props }) => {
		return (
			<h4 className='mb-2 mt-6 text-lg font-semibold' {...props}>
				{children}
			</h4>
		);
	},
	h5: ({ children, ...props }) => {
		return (
			<h5 className='mb-2 mt-6 text-base font-semibold' {...props}>
				{children}
			</h5>
		);
	},
	h6: ({ children, ...props }) => {
		return (
			<h6 className='mb-2 mt-6 text-sm font-semibold' {...props}>
				{children}
			</h6>
		);
	},
	p: ({ children, ...props }) => {
		return (
			<div className='mb-2 last:mb-0' {...props}>
				{children}
			</div>
		);
	},
};

const streamingComponents: Partial<Components> = {
	...components,
	a: ({ children, href, ...props }) => {
		if (!href || (!href.startsWith("http") && !href.startsWith("www"))) {
			return <a {...props}>{children}</a>;
		}

		return (
			<a href={normalizeExternalHref(href)} rel='noreferrer' target='_blank' {...props}>
				{children}
			</a>
		);
	},
};

const remendOptions = { linkMode: "text-only" as const };

export const ChatMessageMarkdown = ({ children, streaming = false }: { children: string; streaming?: boolean }) => {
	return (
		<Streamdown
			className='space-y-2'
			components={streaming ? streamingComponents : components}
			remend={remendOptions}
		>
			{children}
		</Streamdown>
	);
};

ChatMessageMarkdown.displayName = "ChatMessageMarkdown";
