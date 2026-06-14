"use client";

import Image from "next/image";

import { FileIcon, ImageIcon, PaperclipIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@starter/ui/lib/utils";

export type FilePartProps = {
	url: string;
	mediaType: string;
	filename?: string;
};

export const FilePart = ({ url, mediaType, filename }: FilePartProps) => {
	if (mediaType.startsWith("image/") && url) {
		return <ImageFile url={url} mediaType={mediaType} filename={filename} />;
	}

	return <GenericFile mediaType={mediaType} filename={filename} />;
};

FilePart.displayName = "FilePart";

const ImageFile = ({ url, filename }: FilePartProps) => {
	return (
		<div className='overflow-hidden rounded-lg border border-border/50'>
			<Image
				src={url}
				alt={filename || "Attached image"}
				width={1600}
				height={1200}
				unoptimized
				className='h-auto max-h-100 max-w-full object-contain'
			/>
			{filename && (
				<div className='flex items-center gap-1.5 border-t border-border/50 bg-muted/30 px-2.5 py-1.5'>
					<ImageIcon className='size-3 text-muted-foreground/60' />
					<span className='truncate text-xs text-muted-foreground'>{filename}</span>
				</div>
			)}
		</div>
	);
};

const getFilenameExtension = ({ filename }: { filename: string | undefined }) => {
	if (!filename) {
		return null;
	}

	const lastDot = filename.lastIndexOf(".");

	if (lastDot <= 0 || lastDot === filename.length - 1) {
		return null;
	}

	return filename.slice(lastDot + 1).toUpperCase();
};

const getMediaTypeExtension = ({ mediaType }: { mediaType: string }) => {
	const subtype = mediaType.split("/").pop();

	if (!subtype) {
		return null;
	}

	if (subtype.includes(".")) {
		const tail = subtype.split(".").pop();
		return tail ? tail.toUpperCase() : null;
	}

	if (subtype.length > 8) {
		return null;
	}

	return subtype.toUpperCase();
};

const GenericFile = ({ mediaType, filename }: Omit<FilePartProps, "url">) => {
	const t = useTranslations("components.chat.message.file");
	const extension = getFilenameExtension({ filename }) ?? getMediaTypeExtension({ mediaType }) ?? t("file");

	return (
		<div
			className={cn(
				"group flex max-w-65 items-center gap-2 rounded-md border border-border bg-muted/40 ps-2 pe-2.5 py-1.5 text-xs text-muted-foreground"
			)}
		>
			<span className='flex size-6 shrink-0 items-center justify-center rounded-sm bg-background text-muted-foreground/70'>
				<FileIcon className='size-3.5' />
			</span>
			<span className='flex min-w-0 flex-col text-start'>
				<span className='truncate text-foreground'>{filename || t("attachment")}</span>
				<span className='inline-flex items-center gap-1 text-xs text-muted-foreground/70'>
					<PaperclipIcon className='size-2.5' />
					{extension}
				</span>
			</span>
		</div>
	);
};
