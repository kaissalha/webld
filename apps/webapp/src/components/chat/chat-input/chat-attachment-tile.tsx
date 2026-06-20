"use client";

import { useEffect, useId, useState } from "react";

import Image from "next/image";

import { Loader2Icon, X } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useTranslations } from "next-intl";

import type { ChatFileAttachment } from "@/components/chat/chat-attachments";
import {
	getFileExtension,
	getFileSizeParts,
	isTextLikeFile,
	LINE_BREAK_REGEX,
	MAX_PREVIEW_BYTES,
} from "@/components/chat/chat-input/chat-attached-file";
import { fadeEase } from "@/components/chat/chat-input/chat-input-motion";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@webld/ui/components/dialog";
import { cn } from "@webld/ui/lib/utils";

type AttachmentTextLoad = { kind: "loading" } | { kind: "text"; content: string; lines: number } | { kind: "error" };

const TILE_SIZE = { width: 120, height: 120, minWidth: 120, minHeight: 120 } as const;
const IMAGE_PREVIEW_FALLBACK_SIZE = { width: 640, height: 480 } as const;
const attachmentSpringTransition = { type: "spring", duration: 0.38, bounce: 0 } as const;
const attachmentFadeTransition = { duration: 0.18, ease: fadeEase } as const;

const readAttachmentText = async ({ url, signal }: { url: string; signal: AbortSignal }) => {
	const response = await fetch(url, { signal });
	return response.text();
};

const ChatImagePreviewDialog = ({
	attachmentId,
	displayName,
	layoutId,
	open,
	onOpenChange,
	preview,
}: {
	attachmentId: string;
	displayName: string;
	layoutId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	preview: string;
}) => {
	const t = useTranslations("components.chat.chatInput.attachment");
	const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>(IMAGE_PREVIEW_FALLBACK_SIZE);

	return (
		<AnimatePresence>
			{open && (
				<motion.div
					className='pointer-events-none fixed inset-0 z-50 grid place-items-center p-4 md:p-10'
					exit={{ opacity: 1 }}
					initial={false}
					transition={attachmentSpringTransition}
				>
					<motion.button
						animate={{ opacity: 1 }}
						aria-label={t("closeImagePreview")}
						className='pointer-events-auto absolute inset-0 bg-foreground/32 backdrop-blur-sm'
						exit={{ opacity: 0 }}
						initial={{ opacity: 0 }}
						onClick={() => onOpenChange(false)}
						transition={attachmentFadeTransition}
						type='button'
					/>
					<motion.div
						aria-labelledby={`${attachmentId}-image-preview-title`}
						aria-modal='true'
						className='pointer-events-none w-full max-w-160 outline-none'
						onClick={(event) => event.stopPropagation()}
						onKeyDown={(event) => {
							if (event.key === "Escape") {
								onOpenChange(false);
							}
						}}
						role='dialog'
						tabIndex={-1}
					>
						<h2 className='sr-only' id={`${attachmentId}-image-preview-title`}>
							{t("previewTitle", { name: displayName })}
						</h2>

						<div className='pointer-events-auto relative mx-auto w-fit'>
							<button
								aria-label={t("closeImagePreview")}
								className={cn(
									"absolute top-0 start-full z-10 ms-1.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full",
									"text-background outline-none transition-colors duration-200",
									"hover:bg-background/10 hover:text-background",
									"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
								)}
								data-testid='close-file-preview'
								onClick={() => onOpenChange(false)}
								type='button'
							>
								<X aria-hidden className='size-4' strokeWidth={2} />
							</button>

							<motion.div
								className='relative w-[min(var(--preview-width),calc(100vw-2rem))] max-w-full overflow-hidden shadow-xl'
								layoutId={layoutId}
								style={
									{
										"--preview-width": `${Math.min(naturalSize.width, IMAGE_PREVIEW_FALLBACK_SIZE.width)}px`,
										aspectRatio: `${naturalSize.width} / ${naturalSize.height}`,
										borderRadius: 6,
										maxHeight: "calc(100vh - 7rem)",
									} as React.CSSProperties
								}
								transition={attachmentSpringTransition}
							>
								<Image
									alt={t("previewAlt", { name: displayName })}
									className='object-contain'
									fill
									onLoad={(event) => {
										setNaturalSize({
											width: event.currentTarget.naturalWidth,
											height: event.currentTarget.naturalHeight,
										});
									}}
									priority
									sizes='(max-width: 768px) calc(100vw - 2rem), 40rem'
									src={preview}
									unoptimized
								/>
							</motion.div>
						</div>

						<motion.div
							animate={{ opacity: 1, y: 0 }}
							className='wrap-anywhere pointer-events-none relative z-10 pt-1.5 text-center text-sm text-background drop-shadow-md'
							exit={{ opacity: 0, y: -2 }}
							initial={{ opacity: 0, y: 2 }}
							transition={attachmentFadeTransition}
						>
							{displayName}
						</motion.div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

const ChatAttachmentPreviewDialog = ({
	attachment,
	displayName,
	open,
	onOpenChange,
}: {
	attachment: ChatFileAttachment;
	displayName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) => {
	const t = useTranslations("components.chat.chatInput.attachment");
	const tSize = useTranslations("components.chat.chatInput.fileSize");
	const { filename, mediaType, size, url } = attachment;
	const canPreviewText = isTextLikeFile({ filename, mediaType }) && size <= MAX_PREVIEW_BYTES;
	const [loaded, setLoaded] = useState<{ url: string; load: AttachmentTextLoad } | null>(null);
	const textLoad: AttachmentTextLoad = loaded?.url === url ? loaded.load : { kind: "loading" };

	useEffect(() => {
		if (!open || !canPreviewText) {
			return;
		}

		const controller = new AbortController();

		const loadText = async () => {
			try {
				const content = await readAttachmentText({ url, signal: controller.signal });
				if (!controller.signal.aborted) {
					setLoaded({ url, load: { kind: "text", content, lines: content.split(LINE_BREAK_REGEX).length } });
				}
			} catch {
				if (!controller.signal.aborted) {
					setLoaded({ url, load: { kind: "error" } });
				}
			}
		};

		void loadText();
		return () => {
			controller.abort();
		};
	}, [canPreviewText, open, url]);

	const sizeParts = getFileSizeParts(size);
	const sizeLabel = sizeParts.unit === "zero" ? tSize("zero") : tSize(sizeParts.unit, { size: sizeParts.size });

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className={cn(
					"flex max-h-[min(90vh,calc(100%-2rem))] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-4 text-start shadow-xl sm:max-w-3xl md:p-6",
					"text-foreground text-sm"
				)}
				showCloseButton={false}
			>
				<div className='flex min-h-0 min-w-0 flex-1 flex-col'>
					<div className='flex shrink-0 items-start justify-between gap-4'>
						<DialogTitle className='wrap-anywhere w-full min-w-0 pe-2 font-semibold text-base text-foreground leading-6'>
							{displayName}
						</DialogTitle>
						<DialogClose>
							<button
								aria-label={t("close")}
								className={cn(
									"-mx-2 inline-flex size-8 shrink-0 items-center justify-center rounded-md",
									"text-muted-foreground outline-none transition-colors",
									"hover:bg-muted hover:text-foreground",
									"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
								)}
								type='button'
							>
								<X aria-hidden className='size-4' strokeWidth={2} />
							</button>
						</DialogClose>
					</div>

					<DialogDescription className='mt-0.5 mb-2 shrink-0 text-muted-foreground text-xs'>
						<span className='flex flex-wrap items-center gap-y-2 text-xs'>
							<span className='text-muted-foreground'>
								{canPreviewText && textLoad.kind !== "error" ? (
									<span>
										{sizeLabel}
										<span aria-hidden className='mx-1 opacity-50'>
											•
										</span>
										{textLoad.kind === "text" ? (
											t("lineCount", { count: textLoad.lines })
										) : (
											<span className='animate-pulse'>…</span>
										)}
									</span>
								) : (
									<span>{sizeLabel}</span>
								)}
							</span>
							{canPreviewText && textLoad.kind !== "error" ? (
								<>
									<span aria-hidden className='mx-1.5 hidden opacity-50 lg:inline'>
										•
									</span>
									<span className='text-muted-foreground'>{t("formattingDisclaimer")}</span>
								</>
							) : null}
						</span>
					</DialogDescription>

					<div className='min-h-0 flex-1 overflow-hidden'>
						{canPreviewText && textLoad.kind === "loading" && (
							<div className='max-h-[min(60vh,480px)] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border/40 bg-muted/30 p-4 font-mono text-muted-foreground text-xs'>
								{t("loadingPreview")}
							</div>
						)}

						{canPreviewText && textLoad.kind === "text" && (
							<div className='max-h-[min(60vh,480px)] min-h-[120px] overflow-y-auto whitespace-pre-wrap break-all rounded-lg border border-border/40 bg-card p-4 font-mono text-foreground text-xs shadow-sm'>
								{textLoad.content}
							</div>
						)}

						{(!canPreviewText || textLoad.kind === "error") && (
							<div className='rounded-lg border border-border/40 bg-muted/30 p-4 font-mono text-muted-foreground text-xs'>
								{t("previewUnavailable")}
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

type ChatAttachmentTileProps = {
	attachment: ChatFileAttachment;
	onRemove: (id: string) => void;
};

export const ChatAttachmentTile = ({ attachment, onRemove }: ChatAttachmentTileProps) => {
	const t = useTranslations("components.chat.chatInput.attachment");
	const tSize = useTranslations("components.chat.chatInput.fileSize");
	const { filename, id, mediaType, size, uploadStatus, url } = attachment;
	const isImage = mediaType.startsWith("image/");
	const preview = isImage ? url : null;
	const displayName = filename;
	const titleId = useId();
	const imageLayoutId = `chat-attachment-image-${id}`;
	const [previewOpen, setPreviewOpen] = useState(false);
	const [lineCountLabel, setLineCountLabel] = useState<string | null>(null);

	const isPending = uploadStatus === "uploading" || uploadStatus === "processing";
	const hasError = uploadStatus === "error";
	const sizeParts = getFileSizeParts(size);
	const sizeLabel = sizeParts.unit === "zero" ? tSize("zero") : tSize(sizeParts.unit, { size: sizeParts.size });
	const canCountLines = !isImage && size > 0 && isTextLikeFile({ filename, mediaType }) && size <= MAX_PREVIEW_BYTES;
	const statusLabel =
		uploadStatus === "uploading"
			? t("uploading")
			: uploadStatus === "processing"
				? t("processing")
				: uploadStatus === "error"
					? t("uploadFailed")
					: null;
	const detailLine = statusLabel ?? (canCountLines ? lineCountLabel : size === 0 ? t("zeroLines") : sizeLabel);

	useEffect(() => {
		if (!canCountLines) {
			return;
		}

		const controller = new AbortController();

		const loadLineCount = async () => {
			try {
				const text = await readAttachmentText({ url, signal: controller.signal });
				if (!controller.signal.aborted) {
					setLineCountLabel(t("lineCount", { count: text.split(LINE_BREAK_REGEX).length }));
				}
			} catch {
				if (!controller.signal.aborted) {
					setLineCountLabel(sizeLabel);
				}
			}
		};

		void loadLineCount();
		return () => {
			controller.abort();
		};
	}, [canCountLines, sizeLabel, t, url]);

	const extLabel = getFileExtension({ filename, mediaType }) || t("fileExtensionFallback");

	const pendingOverlay = isPending ? (
		<div className='absolute inset-0 z-10 grid place-items-center bg-foreground/10 backdrop-blur-[1px]'>
			<Loader2Icon aria-hidden className='size-5 animate-spin text-foreground/70' />
		</div>
	) : null;

	return (
		<LayoutGroup id={`chat-attachment-${id}`}>
			<div className='group/thumbnail relative shrink-0' data-composer-attachment data-testid='file-thumbnail'>
				{preview ? (
					<ChatImagePreviewDialog
						attachmentId={id}
						displayName={displayName}
						layoutId={imageLayoutId}
						onOpenChange={setPreviewOpen}
						open={previewOpen}
						preview={preview}
					/>
				) : (
					<ChatAttachmentPreviewDialog
						attachment={attachment}
						displayName={displayName}
						onOpenChange={setPreviewOpen}
						open={previewOpen}
					/>
				)}
				{preview ? (
					<button
						aria-label={t("preview", { name: displayName })}
						className={cn(
							"relative block cursor-pointer overflow-hidden rounded-lg border border-border/50 p-0 transition-[border-color,box-shadow] duration-200",
							"hover:shadow-sm",
							hasError && "border-2 border-destructive/60"
						)}
						onClick={() => setPreviewOpen(true)}
						style={TILE_SIZE}
						type='button'
					>
						{pendingOverlay}
						{previewOpen ? (
							<div aria-hidden className='size-full bg-muted/20' style={{ borderRadius: 8 }} />
						) : (
							<motion.div
								className='relative size-full overflow-hidden shadow-sm'
								layoutId={imageLayoutId}
								style={{
									borderRadius: 8,
								}}
								transition={attachmentSpringTransition}
							>
								<Image
									alt={displayName}
									className='object-cover'
									fill
									sizes='120px'
									src={preview}
									unoptimized
								/>
							</motion.div>
						)}
					</button>
				) : (
					<button
						aria-label={t("cardSummary", {
							name: displayName,
							details: [extLabel, detailLine].filter(Boolean).join(", "),
						})}
						className={cn(
							"relative flex cursor-pointer flex-col justify-between gap-2.5 overflow-hidden rounded-lg border border-border/50 bg-card px-2.5 py-2 text-start font-sans transition-all duration-200",
							"hover:shadow-sm",
							hasError && "border-2 border-destructive/60"
						)}
						onClick={() => setPreviewOpen(true)}
						style={TILE_SIZE}
						type='button'
					>
						{pendingOverlay}
						<div className='flex min-h-0 flex-col gap-1'>
							<h3
								className='wrap-anywhere line-clamp-3 text-[12px] text-foreground leading-snug'
								id={titleId}
							>
								{displayName}
							</h3>
							<p
								className={cn(
									"wrap-break-word line-clamp-1 text-[10px] leading-normal",
									hasError ? "text-destructive" : "text-muted-foreground",
									!statusLabel &&
										canCountLines &&
										lineCountLabel === null &&
										"animate-pulse opacity-70"
								)}
							>
								{!statusLabel && canCountLines && lineCountLabel === null ? "…" : detailLine}
							</p>
						</div>
						<div className='relative flex min-h-0 flex-row items-center justify-between gap-1'>
							<div className='flex min-w-0 shrink flex-row gap-1'>
								<div
									className={cn(
										"flex h-[18px] min-w-0 shrink flex-row items-center justify-center gap-0.5 rounded bg-background/70 px-1 font-medium shadow-sm backdrop-blur-sm transition-all duration-200"
									)}
								>
									<p className='truncate font-sans text-[11px] text-foreground/90 uppercase leading-[13px]'>
										{extLabel.slice(0, 6).toUpperCase()}
									</p>
								</div>
							</div>
						</div>
					</button>
				)}
				<button
					aria-describedby={preview ? undefined : titleId}
					aria-label={t("remove")}
					className={cn(
						"-top-2 -start-2 absolute z-20 flex size-5 items-center justify-center rounded-full hover:cursor-pointer",
						"border border-border/80 bg-background/90 text-muted-foreground backdrop-blur-sm",
						"transition-all duration-200",
						"opacity-0 group-focus-within/thumbnail:opacity-100 group-hover/thumbnail:opacity-100",
						"hover:bg-background/50 hover:text-foreground",
						"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
					)}
					data-composer-attachment
					onClick={(e) => {
						e.stopPropagation();
						onRemove(id);
					}}
					type='button'
				>
					<X aria-hidden className='size-3' strokeWidth={2} />
				</button>
			</div>
		</LayoutGroup>
	);
};
