"use client";

import { CheckCircle2Icon, TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Loader } from "@webld/ui/components/loader";
import { TextShimmer } from "@webld/ui/components/text-shimmer";

import { formatToolName } from "./tool-output-helpers";

export const ToolLoading = ({ message }: { message: string }) => {
	return (
		<div className='flex items-center gap-2.5 rounded-2xl border border-border/50 bg-muted/30 px-4 py-3'>
			<Loader size={16} className='text-muted-foreground' />
			<TextShimmer className='text-sm font-medium text-muted-foreground'>{message}</TextShimmer>
		</div>
	);
};

export const ToolError = ({ errorText }: { errorText?: string }) => {
	const t = useTranslations("components.chat.message.tool");

	return (
		<div className='flex items-center gap-3 rounded-2xl bg-destructive/10 px-4 py-3 text-destructive'>
			<TriangleAlertIcon className='size-4' />
			<span className='text-sm'>{errorText || t("error")}</span>
		</div>
	);
};

export const GenericToolOutput = ({ toolName }: { toolName: string }) => {
	const t = useTranslations("components.chat.message.tool");
	const formattedName = formatToolName(toolName);

	return (
		<div className='flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/30 px-4 py-3'>
			<CheckCircle2Icon className='size-4 text-success' />
			<span className='text-sm text-muted-foreground'>
				<span className='font-semibold text-foreground'>{formattedName}</span> {t("completed")}
			</span>
		</div>
	);
};
