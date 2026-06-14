import { memo, useMemo } from "react";

import { marked } from "marked";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Streamdown } from "streamdown";

import { LinkPreview } from "./link-preview";

type MarkdownBlock = {
	content: string;
	key: string;
};

type StreamingMarkdownPartition = {
	settledBlocks: MarkdownBlock[];
	tail: string;
};

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

		const normalizedHref = normalizeExternalHref(href);
		return <LinkPreview url={normalizedHref}>{children}</LinkPreview>;
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

const remarkPlugins = [remarkGfm];
const remendOptions = { linkMode: "text-only" as const };
const fencedCodeBlockPattern = /^(`{3,}|~{3,})/;
const headingPattern = /^#{1,6}\s+\S/;
const horizontalRulePattern = /^(?:-{3,}|\*{3,}|_{3,})\s*$/;

const parseMarkdownIntoBlocks = (markdown: string): MarkdownBlock[] => {
	const tokens = marked.lexer(markdown);
	let offset = 0;

	return tokens.map((token) => {
		let raw = token.raw;
		raw = raw.replace(/\(\[([^\]]+)\]\(([^)]+)\)\)/g, "[$1]($2)");
		const block = {
			content: raw,
			key: `${offset}-${token.raw.length}`,
		};
		offset += token.raw.length;
		return block;
	});
};

const getMarkdownLines = (markdown: string): Array<{ content: string; start: number }> => {
	return Array.from(markdown.matchAll(/[^\r\n]*(?:\r?\n|$)/g))
		.map((match) => ({
			content: match[0],
			start: match.index ?? 0,
		}))
		.filter((line) => line.content.length > 0);
};

const isStandaloneMarkdownBlock = (line: string): boolean => {
	const trimmed = line.trim();

	if (trimmed === "") {
		return false;
	}

	return headingPattern.test(trimmed) || horizontalRulePattern.test(trimmed);
};

const partitionStreamingMarkdown = (markdown: string): StreamingMarkdownPartition => {
	const lines = getMarkdownLines(markdown);

	if (lines.length === 0) {
		return { settledBlocks: [], tail: markdown };
	}

	const settledBlocks: MarkdownBlock[] = [];
	let currentBlock = "";
	let openFence: string | null = null;
	let currentBlockStart = 0;

	for (const line of lines) {
		const trimmedLine = line.content.trim();
		const trimmedStartLine = line.content.trimStart();
		const fenceMatch = trimmedStartLine.match(fencedCodeBlockPattern);

		if (!openFence && trimmedLine === "" && currentBlock === "") {
			continue;
		}

		if (currentBlock === "") {
			currentBlockStart = line.start;
		}

		currentBlock += line.content;

		if (fenceMatch) {
			const fence = fenceMatch[1];

			if (!openFence) {
				openFence = fence;
				continue;
			}

			if (fence[0] === openFence[0] && fence.length >= openFence.length) {
				openFence = null;
				settledBlocks.push({
					content: currentBlock,
					key: `${currentBlockStart}-${currentBlock.length}`,
				});
				currentBlock = "";
			}

			continue;
		}

		if (openFence) {
			continue;
		}

		if (trimmedLine === "") {
			settledBlocks.push({
				content: currentBlock,
				key: `${currentBlockStart}-${currentBlock.length}`,
			});
			currentBlock = "";
			continue;
		}

		if (isStandaloneMarkdownBlock(line.content)) {
			settledBlocks.push({
				content: currentBlock,
				key: `${currentBlockStart}-${currentBlock.length}`,
			});
			currentBlock = "";
		}
	}

	return {
		settledBlocks,
		tail: currentBlock,
	};
};

export const MemoizedMarkdownBlock = memo(({ content }: { content: string }) => {
	return (
		<Streamdown remarkPlugins={remarkPlugins} components={components} remend={remendOptions}>
			{content}
		</Streamdown>
	);
});
MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

const MemoizedStreamingMarkdownBlock = memo(({ content }: { content: string }) => {
	return (
		<Streamdown remarkPlugins={remarkPlugins} components={components} remend={remendOptions}>
			{content}
		</Streamdown>
	);
});
MemoizedStreamingMarkdownBlock.displayName = "MemoizedStreamingMarkdownBlock";

const StreamingMarkdownRenderer = memo(({ children }: { children: string }) => {
	return (
		<Streamdown remarkPlugins={remarkPlugins} components={streamingComponents} remend={remendOptions}>
			{children}
		</Streamdown>
	);
});
StreamingMarkdownRenderer.displayName = "StreamingMarkdownRenderer";

export const ChatMessageMarkdown = memo(
	({ children, id, streaming = false }: { children: string; id: string; streaming?: boolean }) => {
		const blocks = useMemo(() => {
			if (streaming) {
				return [];
			}

			return parseMarkdownIntoBlocks(children);
		}, [children, streaming]);

		const streamingPartition = useMemo(() => {
			if (!streaming) {
				return { settledBlocks: [], tail: "" };
			}

			return partitionStreamingMarkdown(children);
		}, [children, streaming]);

		if (streaming) {
			return (
				<div className='space-y-2'>
					{streamingPartition.settledBlocks.map((block) => (
						<MemoizedStreamingMarkdownBlock
							content={block.content}
							key={`${id}-streaming-block_${block.key}`}
						/>
					))}
					{streamingPartition.tail ? (
						<StreamingMarkdownRenderer>{streamingPartition.tail}</StreamingMarkdownRenderer>
					) : null}
				</div>
			);
		}

		return (
			<div className='space-y-2'>
				{blocks.map((block) => (
					<MemoizedMarkdownBlock content={block.content} key={`${id}-block_${block.key}`} />
				))}
			</div>
		);
	}
);

ChatMessageMarkdown.displayName = "ChatMessageMarkdown";
