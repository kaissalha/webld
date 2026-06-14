import { cloneElement, createElement, Fragment, isValidElement, type ReactNode } from "react";

import type { Locale } from ".";
import enMessages from "./messages/en.json";

export type TranslationParams = {
	[key: string]: string | number | null | undefined;
};

export type MarkupComponent = {
	[key: string]: (chunks: ReactNode) => ReactNode;
};

const withStableMarkupKey = ({ key, node }: { key: string; node: ReactNode }) => {
	if (isValidElement(node)) {
		return cloneElement(node, {
			key,
		});
	}

	return createElement(Fragment, { key }, node);
};

type Join<K, P> = K extends string | number
	? P extends string | number
		? `${K}${P extends "" ? "" : "."}${P}`
		: never
	: never;

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...0[]];

type Paths<T, D extends number = 10> = [D] extends [never]
	? never
	: T extends object
		? {
				[K in keyof T]-?: K extends string | number ? `${K}` | Join<K, Paths<T[K], Prev[D]>> : never;
			}[keyof T]
		: "";

// Get the type from the English messages as it's our source of truth
export type TranslationKey = Paths<typeof enMessages>;

// Define the structure of a translation set
type TranslationSet = {
	[K in TranslationKey]: string;
};

// Type for message files
type Messages = {
	[key: string]: string | Record<string, unknown>;
};

const localeMessages: Record<Locale, Messages> = {
	en: enMessages as Messages,
};

const flattenMessages = (messages: Messages, prefix = ""): Record<string, string> => {
	return Object.keys(messages).reduce((acc: Record<string, string>, key: string) => {
		const prefixedKey = prefix ? `${prefix}.${key}` : key;
		if (typeof messages[key] === "string") {
			acc[prefixedKey] = messages[key] as string;
		} else if (typeof messages[key] === "object") {
			Object.assign(acc, flattenMessages(messages[key] as Messages, prefixedKey));
		}
		return acc;
	}, {});
};

// Parse a message with markup tags and process it with component functions
export const parseMarkup = (message: string, components: MarkupComponent): ReactNode => {
	if (!message) return message;

	// Match both paired tags like <strong>text</strong> and self-closing tags like <br />.
	const tagPattern = /<([a-zA-Z0-9_]+)\s*\/>|<([a-zA-Z0-9_]+)>(.*?)<\/\2>/gs;

	// Find all tags in the message
	const matches = [...message.matchAll(tagPattern)];

	// If no tags found, return the message as is
	if (matches.length === 0) {
		return message;
	}

	// Build the result by processing tags and adding text between them
	const result: ReactNode[] = [];
	let lastIndex = 0;

	matches.forEach((match) => {
		const [fullMatch, selfClosingTagName, pairedTagName, content = ""] = match;
		const startIndex = match.index as number;
		const tagName = selfClosingTagName ?? pairedTagName;

		// Add text before this tag
		if (startIndex > lastIndex) {
			result.push(message.substring(lastIndex, startIndex));
		}

		// Process the tag content recursively (in case of nested tags)
		const processedContent = content ? parseMarkup(content, components) : null;

		// Apply the component function if it exists
		if (components[tagName]) {
			result.push(
				withStableMarkupKey({
					key: `markup-${startIndex}`,
					node: components[tagName](processedContent),
				})
			);
		} else {
			// If no component function is provided, just include the content
			result.push(processedContent);
		}

		lastIndex = startIndex + fullMatch.length;
	});

	// Add any remaining text after the last tag
	if (lastIndex < message.length) {
		result.push(message.substring(lastIndex));
	}

	return result.length === 1 ? result[0] : result;
};

export const translations = (locale: Locale, params?: TranslationParams): TranslationSet => {
	const interpolateMessage = (message: string, params?: TranslationParams): string => {
		if (!params) return message;
		return Object.entries(params).reduce(
			(acc, [key, value]) => acc.replace(`{${key}}`, String(value ?? "")),
			message
		);
	};

	const messages = flattenMessages(localeMessages[locale]);
	const englishMessages = flattenMessages(localeMessages.en);
	const translationSet = {} as TranslationSet;

	// Only include messages that exist in English (our source of truth)
	Object.keys(englishMessages).forEach((key) => {
		const message = messages[key] || englishMessages[key]; // Fallback to English if translation is missing
		if (message) {
			const interpolated = interpolateMessage(message, params);
			translationSet[key as TranslationKey] = interpolated.replace(/\n/g, "<br />");
		}
	});

	return translationSet;
};
