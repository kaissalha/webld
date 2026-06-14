"use client";

import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { useTextareaResize } from "@/hooks/use-textarea-resize";
import { useTRPC } from "@/lib/trpc";
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
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const tCommon = useTranslations("common");
	const tEmailDraft = useTranslations("components.chat.message.tool.emailDraft");
	const tMail = useTranslations("mail");
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
	const connectionsQuery = useQuery(trpc.mail.listConnections.queryOptions());
	const activeConnection = connectionsQuery.data?.find((connection) => connection.status === "connected");
	const recipients = parseRecipients({ address });
	const canCopyMessage = content.length > 0;
	const canSendAction = address.trim().length > 0 || title.trim().length > 0 || content.length > 0;
	const canSendWithGmail =
		Boolean(activeConnection) &&
		recipients.length > 0 &&
		recipients.every(({ email }) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

	const sendMutation = useMutation(
		trpc.mail.send.mutationOptions({
			onSuccess: async () => {
				toast.success(tMail("sent"));
				await Promise.all([
					queryClient.invalidateQueries({ queryKey: trpc.mail.listThreads.queryKey() }),
					activeConnection
						? queryClient.invalidateQueries({
								queryKey: trpc.mail.getLabelCounts.queryKey({ connectionId: activeConnection.id }),
							})
						: Promise.resolve(),
				]);
			},
			onError: () => {
				toast.error(tCommon("errors.somethingWentWrong"));
			},
		})
	);

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

	const handleSend = () => {
		if (canSendWithGmail && activeConnection) {
			sendMutation.mutate({
				connectionId: activeConnection.id,
				to: recipients,
				subject: title,
				body: content,
			});
			return;
		}

		openMailApp();
	};

	return {
		address,
		canCopyMessage,
		canSendAction,
		canSendWithGmail,
		content,
		copyToClipboard,
		handleSend,
		isCopied,
		isSending: sendMutation.isPending,
		mailActionLabel: canSendWithGmail ? tMail("send") : tEmailDraft("openInMailApp"),
		openedMailApp,
		setAddress,
		setContent,
		setTitle,
		textareaRef,
		title,
	};
};
