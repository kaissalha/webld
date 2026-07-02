import { file } from "@webld/utils";

export const TEXT_LIKE_EXTENSIONS = new Set([
	"md",
	"txt",
	"markdown",
	"json",
	"csv",
	"xml",
	"html",
	"htm",
	"css",
	"js",
	"mjs",
	"cjs",
	"ts",
	"tsx",
	"jsx",
	"vue",
	"svelte",
	"log",
	"env",
	"yml",
	"yaml",
	"toml",
	"ini",
	"cfg",
	"gitignore",
	"editorconfig",
]);

export const LINE_BREAK_REGEX = /\r\n|\r|\n/;
export const MAX_PREVIEW_BYTES = 512 * 1024;

export const getFileExtension = file.getFileExtension;

export const isTextLikeFile = ({ filename, mediaType }: { filename: string; mediaType: string }) => {
	return mediaType.startsWith("text/") || TEXT_LIKE_EXTENSIONS.has(getFileExtension({ filename, mediaType }));
};

const FILE_SIZE_UNITS = ["bytes", "kilobytes", "megabytes", "gigabytes"] as const;

export type FileSizeParts = { unit: "zero" } | { unit: (typeof FILE_SIZE_UNITS)[number]; size: number };

export const getFileSizeParts = (bytes: number): FileSizeParts => {
	if (bytes === 0) {
		return { unit: "zero" };
	}
	const k = 1024;
	const unitIndex = Math.min(FILE_SIZE_UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
	const value = bytes / k ** unitIndex;
	const size = unitIndex === 0 || value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
	return { unit: FILE_SIZE_UNITS[unitIndex], size };
};
