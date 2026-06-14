export const normalizeText = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

export const countWords = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

export const countSentences = (value: string) => {
	const matches = value.match(/[^.!?]+[.!?]+/g);

	if (matches) {
		return matches.length;
	}

	return value.trim() ? 1 : 0;
};

export const hasMarkdownishFormatting = (value: string) => /(^|\n)\s*[-*#]|\|.+\||`/.test(value);

export const scoreKeywordGroups = ({ text, keywordGroups }: { text: string; keywordGroups: string[][] }) => {
	if (keywordGroups.length === 0) {
		return 1;
	}

	const normalized = normalizeText(text);
	const matchedGroups = keywordGroups.filter((group) =>
		group.some((keyword) => normalized.includes(normalizeText(keyword)))
	).length;

	return matchedGroups / keywordGroups.length;
};
