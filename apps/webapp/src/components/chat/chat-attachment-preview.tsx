"use client";

import { Loader2Icon, PaperclipIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { ChatFileAttachment } from "@/components/chat/chat-attachments";
import { cn } from "@webld/ui/lib/utils";

type ChatAttachmentPreviewProps = {
	attachments: ChatFileAttachment[];
	className?: string;
	onRemoveAttachment: (id: string) => void;
	removeLabel: (filename: string) => string;
};

export const ChatAttachmentPreview = ({
	attachments,
	className,
	onRemoveAttachment,
	removeLabel,
}: ChatAttachmentPreviewProps) => {
	return (
		<div className={cn("flex flex-wrap gap-1.5 px-1 pt-1", className)}>
			<AnimatePresence mode='popLayout'>
				{attachments.map((attachment) => {
					const isPending =
						attachment.uploadStatus === "uploading" || attachment.uploadStatus === "processing";
					const hasError = attachment.uploadStatus === "error";

					return (
						<motion.button
							key={attachment.id}
							layout
							type='button'
							initial={{ width: 0, opacity: 0 }}
							animate={{ width: "auto", opacity: 1 }}
							exit={{ width: 0, opacity: 0 }}
							transition={{ duration: 0.15, ease: "easeOut" }}
							onClick={() => onRemoveAttachment(attachment.id)}
							aria-label={removeLabel(attachment.filename)}
							className={cn(
								"group flex max-w-50 items-center gap-1.5 overflow-hidden rounded-sm border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors",
								"hover:border-primary/30",
								hasError && "border-destructive/40 text-destructive"
							)}
						>
							{isPending ? (
								<Loader2Icon className='size-3 shrink-0 animate-spin text-muted-foreground/60' />
							) : (
								<PaperclipIcon className='size-3 shrink-0 text-muted-foreground/40' />
							)}
							<span className='truncate'>{attachment.filename}</span>
							<XIcon className='size-2.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100' />
						</motion.button>
					);
				})}
			</AnimatePresence>
		</div>
	);
};
