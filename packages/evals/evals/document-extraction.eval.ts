import { createScorer, evalite } from "evalite";

import { extractFileText, isSupportedRagFile } from "@webld/server/document-extraction";

import { scoreKeywordGroups } from "./utils";

// =============================================================================
// File-type support detection
// =============================================================================

type SupportInput = {
	extension: string;
	mimeType: string;
};

type SupportOutput = {
	supported: boolean;
};

type SupportExpected = {
	supported: boolean;
};

const supportDetectionScorer = createScorer<SupportInput, SupportOutput, SupportExpected>({
	name: "Classifies file type support correctly",
	scorer: ({ expected, output }) => (output.supported === expected.supported ? 1 : 0),
});

evalite<SupportInput, SupportOutput, SupportExpected>("RAG file type support detection", {
	data: [
		{ input: { extension: "pdf", mimeType: "application/pdf" }, expected: { supported: true } },
		{
			input: {
				extension: "docx",
				mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			},
			expected: { supported: true },
		},
		{
			input: {
				extension: "xlsx",
				mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			},
			expected: { supported: true },
		},
		{ input: { extension: "xls", mimeType: "application/vnd.ms-excel" }, expected: { supported: true } },
		{ input: { extension: "csv", mimeType: "text/csv" }, expected: { supported: true } },
		{ input: { extension: "html", mimeType: "text/html" }, expected: { supported: true } },
		{ input: { extension: "xml", mimeType: "application/xml" }, expected: { supported: true } },
		{ input: { extension: "md", mimeType: "text/markdown" }, expected: { supported: true } },
		{ input: { extension: "json", mimeType: "application/json" }, expected: { supported: true } },
		{ input: { extension: "txt", mimeType: "text/plain" }, expected: { supported: true } },
		// Adversarial: types that must NOT be treated as knowledge-base documents.
		{ input: { extension: "png", mimeType: "image/png" }, expected: { supported: false } },
		{ input: { extension: "zip", mimeType: "application/zip" }, expected: { supported: false } },
		{ input: { extension: "exe", mimeType: "application/octet-stream" }, expected: { supported: false } },
	],
	task: async (input) => ({ supported: isSupportedRagFile(input) }),
	scorers: [supportDetectionScorer],
});

// =============================================================================
// Text extraction across reader-backed and plain-text formats
// =============================================================================

type ExtractionInput = {
	content: string;
	extension: string;
	mimeType: string;
};

type ExtractionExpected = {
	keywordGroups: string[][];
};

const extractionCoverageScorer = createScorer<ExtractionInput, string, ExtractionExpected>({
	name: "Extracted text preserves source content",
	scorer: ({ expected, output }) => scoreKeywordGroups({ keywordGroups: expected.keywordGroups, text: output }),
});

evalite<ExtractionInput, string, ExtractionExpected>("RAG document text extraction", {
	data: [
		{
			input: {
				content: "name,role\nAlice,Engineer\nBob,Designer",
				extension: "csv",
				mimeType: "text/csv",
			},
			expected: { keywordGroups: [["Alice"], ["Engineer"], ["Bob"], ["Designer"]] },
		},
		{
			input: {
				content:
					"<html><body><h1>Quarterly Report</h1><p>Revenue grew by 20 percent this quarter.</p></body></html>",
				extension: "html",
				mimeType: "text/html",
			},
			expected: { keywordGroups: [["Quarterly Report"], ["Revenue"], ["percent"]] },
		},
		{
			input: {
				content: "<note><to>Team</to><message>Ship the release on Friday</message></note>",
				extension: "xml",
				mimeType: "application/xml",
			},
			expected: { keywordGroups: [["Team"], ["release"], ["Friday"]] },
		},
		{
			input: {
				content: '{"project":"Apollo","status":"active","owner":"Dana"}',
				extension: "json",
				mimeType: "application/json",
			},
			expected: { keywordGroups: [["Apollo"], ["active"], ["Dana"]] },
		},
		{
			input: {
				content: "# Roadmap\n\n- Launch beta in March\n- Hire two engineers",
				extension: "md",
				mimeType: "text/markdown",
			},
			expected: { keywordGroups: [["Roadmap"], ["Launch beta"], ["Hire"]] },
		},
		{
			input: {
				content: "The mitochondria is the powerhouse of the cell.",
				extension: "txt",
				mimeType: "text/plain",
			},
			expected: { keywordGroups: [["mitochondria"], ["powerhouse"]] },
		},
	],
	task: async ({ content, extension, mimeType }) =>
		extractFileText({ buffer: Buffer.from(content, "utf-8"), extension, mimeType }),
	scorers: [extractionCoverageScorer],
});
