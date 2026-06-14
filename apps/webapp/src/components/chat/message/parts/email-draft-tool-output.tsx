"use client";

import { useId } from "react";

import { CheckIcon, CopyIcon, SendIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@starter/ui/components/button";

import { type EmailDraftOutput, useEmailDraftToolController } from "./use-email-draft-tool-controller";

export const EmailDraftToolOutput = ({ output }: { output: EmailDraftOutput }) => {
	const t = useTranslations("components.chat.message.tool.emailDraft");
	const toInputId = useId();
	const subjectInputId = useId();
	const messageInputId = useId();
	const {
		address,
		canCopyMessage,
		canSendAction,
		content,
		copyToClipboard,
		handleSend,
		isCopied,
		isSending,
		mailActionLabel,
		openedMailApp,
		setAddress,
		setContent,
		setTitle,
		textareaRef,
		title,
	} = useEmailDraftToolController({ output });

	return (
		<div className='w-full max-w-3xl animate-fade-in-up overflow-hidden rounded-3xl border border-border/60 bg-linear-to-b from-secondary/30 via-card to-card shadow-xs transition-[border-color,box-shadow,transform] duration-200 ease-[var(--ease-out-quint)] focus-within:border-ring/30 focus-within:shadow-sm motion-reduce:animate-none motion-reduce:transition-none'>
			<div className='divide-y divide-border/50'>
				<div className='grid gap-1.5 px-4 py-3 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:items-center sm:gap-4 sm:px-5'>
					<label
						htmlFor={toInputId}
						className='text-xs font-medium uppercase tracking-widest text-muted-foreground'
					>
						{t("to")}
					</label>
					<div className='flex items-center gap-2'>
						<input
							id={toInputId}
							type='text'
							value={address}
							onChange={(event) => setAddress(event.target.value)}
							placeholder={t("addressPlaceholder")}
							className='min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/72 sm:text-sm'
						/>
						<div className='flex shrink-0 items-center gap-1'>
							<Button
								type='button'
								size='icon'
								variant={isCopied ? "secondary" : "ghost"}
								className='text-muted-foreground hover:text-foreground'
								aria-label={isCopied ? t("copiedMessage") : t("copyMessage")}
								title={isCopied ? t("copiedMessage") : t("copyMessage")}
								disabled={!canCopyMessage}
								onClick={() => copyToClipboard(content)}
							>
								{isCopied ? <CheckIcon className='size-4' /> : <CopyIcon className='size-4' />}
							</Button>
							<Button
								type='button'
								size='icon'
								variant={openedMailApp ? "secondary" : "ghost"}
								className='text-muted-foreground hover:text-foreground'
								aria-label={mailActionLabel}
								title={mailActionLabel}
								disabled={!canSendAction}
								loading={isSending}
								onClick={handleSend}
							>
								{openedMailApp ? <CheckIcon className='size-4' /> : <SendIcon className='size-4' />}
							</Button>
						</div>
					</div>
				</div>

				<div className='grid gap-1.5 px-4 py-3 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:items-center sm:gap-4 sm:px-5'>
					<label
						htmlFor={subjectInputId}
						className='text-xs font-medium uppercase tracking-widest text-muted-foreground'
					>
						{t("subject")}
					</label>
					<input
						id={subjectInputId}
						type='text'
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						placeholder={t("subjectPlaceholder")}
						className='w-full bg-transparent text-base font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground/72 sm:text-sm'
					/>
				</div>

				<div className='grid gap-1.5 px-4 py-3 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:items-start sm:gap-4 sm:px-5 sm:py-4'>
					<label
						htmlFor={messageInputId}
						className='pt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground'
					>
						{t("message")}
					</label>
					<textarea
						id={messageInputId}
						ref={textareaRef}
						value={content}
						onChange={(event) => setContent(event.target.value)}
						placeholder={t("contentPlaceholder")}
						className='min-h-44 w-full resize-none bg-transparent text-base leading-7 outline-none placeholder:text-muted-foreground/72 sm:text-sm'
					/>
				</div>
			</div>
		</div>
	);
};
