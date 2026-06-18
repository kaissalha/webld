import type { Document, FileReader } from "@vectorstores/core";
import { ExcelReader } from "@vectorstores/excel";
import { CSVReader } from "@vectorstores/readers/csv";
import { DocxReader } from "@vectorstores/readers/docx";
import { HTMLReader } from "@vectorstores/readers/html";
import { PDFReader } from "@vectorstores/readers/pdf";
import { XMLReader } from "@vectorstores/readers/xml";

type RagFile = {
	extension: string;
	mimeType: string;
};

const TEXT_FILE_EXTENSIONS = new Set(["json", "log", "md", "mdx", "txt", "yaml", "yml"]);

const EXCEL_MIME_TYPES = new Set([
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.ms-excel",
]);

type RagFileExtractor = {
	extract: (params: { buffer: Buffer; content: Uint8Array }) => Promise<string> | string;
	matches: (file: RagFile) => boolean;
};

const extractWithReader = async ({ content, reader }: { content: Uint8Array; reader: FileReader<Document> }) => {
	const documents = await reader.loadDataAsContent(content);

	return documents.map((document) => document.getText()).join("\n\n");
};

const RAG_FILE_EXTRACTORS: RagFileExtractor[] = [
	{
		matches: ({ extension, mimeType }) => mimeType === "application/pdf" || extension === "pdf",
		extract: ({ content }) => extractWithReader({ content, reader: new PDFReader() }),
	},
	{
		matches: ({ extension, mimeType }) =>
			mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
			extension === "docx",
		extract: ({ content }) => extractWithReader({ content, reader: new DocxReader() }),
	},
	{
		matches: ({ extension, mimeType }) =>
			EXCEL_MIME_TYPES.has(mimeType) || extension === "xlsx" || extension === "xls",
		extract: ({ content }) => extractWithReader({ content, reader: new ExcelReader() }),
	},
	{
		matches: ({ extension, mimeType }) => mimeType === "text/csv" || extension === "csv",
		extract: ({ content }) => extractWithReader({ content, reader: new CSVReader() }),
	},
	{
		matches: ({ extension, mimeType }) => mimeType === "text/html" || extension === "html" || extension === "htm",
		extract: ({ content }) => extractWithReader({ content, reader: new HTMLReader() }),
	},
	{
		matches: ({ extension, mimeType }) =>
			mimeType === "application/xml" || mimeType === "text/xml" || extension === "xml",
		extract: ({ content }) => extractWithReader({ content, reader: new XMLReader() }),
	},
	{
		matches: ({ extension, mimeType }) =>
			mimeType.startsWith("text/") || mimeType === "application/json" || TEXT_FILE_EXTENSIONS.has(extension),
		extract: ({ buffer }) => buffer.toString("utf-8"),
	},
];

export const isSupportedRagFile = (file: RagFile) => RAG_FILE_EXTRACTORS.some((extractor) => extractor.matches(file));

export const extractFileText = async ({ buffer, extension, mimeType }: RagFile & { buffer: Buffer }) => {
	const content = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	const extractor = RAG_FILE_EXTRACTORS.find((entry) => entry.matches({ extension, mimeType }));

	if (!extractor) {
		throw new Error(`Unsupported file type: ${mimeType || extension || "unknown"}`);
	}

	return extractor.extract({ buffer, content });
};
