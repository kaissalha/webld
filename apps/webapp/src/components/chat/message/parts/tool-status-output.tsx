"use client";

import { CheckCircle2Icon, TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Loader } from "@webld/ui/components/loader";
import { TextShimmer } from "@webld/ui/components/text-shimmer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@webld/ui/components/tooltip";

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

export const DataToolBadge = ({ toolName }: { toolName: string }) => {
	const label = formatToolName(toolName);

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger
					delay={0}
					render={
						<div className='border-black/6 bg-black/2 flex w-fit max-w-full items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm text-black/65'>
							<CheckCircle2Icon className='size-4 shrink-0 text-black/45' />
							<span className='max-w-100 truncate'>{label}</span>
						</div>
					}
				/>
				<TooltipContent side='top' align='start' className='max-w-130'>
					<p className='wrap-break-word max-w-130'>{label}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
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
