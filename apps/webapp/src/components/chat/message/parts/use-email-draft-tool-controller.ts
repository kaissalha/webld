"use client";

import { useEffect, useState } from "react";

import { useTranslations } from "next-intl";

import { useTextareaResize } from "@/hooks/use-textarea-resize";
import { toast } from "@webld/ui/components/sonner";
import { useCopyToClipboard } from "@webld/ui/hooks/use-copy-to-clipboard";

export type EmailDraftOutput = {
	address: string;
	content: string;
	title: string;
};

const buildMailtoHref = ({ address, content, title }: EmailDraftOutput) => {
	const params = new URLSearchParams();
	const nextTitle = title.trim();

	if (nextTitle) {
		params.set("subject", nextTitle);
	}

	if (content) {
		params.set("body", content);
	}

	const recipient = parseRecipients({ address })
		.map(({ email }) => email)
		.join(",");
	const query = params.toString();

	return `mailto:${recipient || address.trim()}${query ? `?${query}` : ""}`;
};

const parseRecipients = ({ address }: { address: string }) => {
	return address
		.split(/[,\n;]/)
		.map((value) => value.trim())
		.filter(Boolean)
		.map((email) => ({ email }));
};

export const useEmailDraftToolController = ({ output }: { output: EmailDraftOutput }) => {
	const tEmailDraft = useTranslations("components.chat.message.tool.emailDraft");
	const [address, setAddress] = useState(output.address);
	const [title, setTitle] = useState(output.title);
	const [content, setContent] = useState(output.content);
	const [openedMailApp, setOpenedMailApp] = useState(false);
	const { textareaRef } = useTextareaResize(content, 8);
	const { copyToClipboard, isCopied } = useCopyToClipboard({
		onCopy: () => {
			toast.success(tEmailDraft("copiedMessage"));
		},
	});
	const canCopyMessage = content.length > 0;
	const canSendAction = address.trim().length > 0 || title.trim().length > 0 || content.length > 0;

	useEffect(() => {
		if (!openedMailApp) {
			return undefined;
		}

		const timeoutId = window.setTimeout(() => {
			setOpenedMailApp(false);
		}, 2000);

		return () => window.clearTimeout(timeoutId);
	}, [openedMailApp]);

	const openMailApp = () => {
		setOpenedMailApp(true);
		window.location.href = buildMailtoHref({ address, content, title });
	};

	return {
		address,
		canCopyMessage,
		canSendAction,
		content,
		copyToClipboard,
		handleSend: openMailApp,
		isCopied,
		isSending: false,
		mailActionLabel: tEmailDraft("openInMailApp"),
		openedMailApp,
		setAddress,
		setContent,
		setTitle,
		textareaRef,
		title,
	};
};
