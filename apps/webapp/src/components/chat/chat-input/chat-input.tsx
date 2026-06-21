"use client";

import { createContext, use, useCallback, useMemo, useRef } from "react";

import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@webld/ui/components/button";
import { cn } from "@webld/ui/lib/utils";

type ChatInputContextValue = {
	value: string;
	onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
	onSubmit: () => void;
	isLoading: boolean;
	isDisabled: boolean;
	canSubmit: boolean;
	onStop?: () => void;
	onPaste?: React.ClipboardEventHandler<HTMLTextAreaElement>;
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	syncTextareaHeight: () => void;
	onShellPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
};

const ChatInputContext = createContext<ChatInputContextValue | null>(null);

export const useChatInputContext = () => {
	const context = use(ChatInputContext);
	if (!context) {
		throw new Error("ChatInput components must be used within ChatInput");
	}
	return context;
};

type ChatInputProps = {
	children: React.ReactNode;
	className?: string;
	containerClassName?: string;
	value: string;
	onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
	onSubmit: () => void;
	loading?: boolean;
	disabled?: boolean;
	canSubmit?: boolean;
	onStop?: () => void;
	onPaste?: React.ClipboardEventHandler<HTMLTextAreaElement>;
	textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
};

export const ChatInput = ({
	children,
	className,
	containerClassName,
	value,
	onChange,
	onSubmit,
	loading = false,
	disabled = false,
	canSubmit,
	onStop,
	onPaste,
	textareaRef: externalTextareaRef,
}: ChatInputProps) => {
	const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
	const textareaRef = externalTextareaRef ?? internalTextareaRef;

	const syncTextareaHeight = useCallback(() => {
		const el = textareaRef.current;
		if (!el) {
			return;
		}
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 384)}px`;
	}, [textareaRef]);

	const onShellPointerDown = useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (event.button !== 0) {
				return;
			}

			const target = event.target;
			if (!(target instanceof Element)) {
				return;
			}

			const interactiveTarget = target.closest(
				"button, a, input, select, textarea, [contenteditable]:not([contenteditable='false']), [role='button']"
			);
			if (interactiveTarget) {
				return;
			}

			event.preventDefault();
			textareaRef.current?.focus({ preventScroll: true });
		},
		[textareaRef]
	);

	const resolvedCanSubmit = canSubmit ?? Boolean(value.trim());

	const contextValue = useMemo(
		() => ({
			value,
			onChange,
			onSubmit,
			isLoading: loading,
			isDisabled: disabled || loading,
			canSubmit: resolvedCanSubmit,
			onStop,
			onPaste,
			textareaRef,
			syncTextareaHeight,
			onShellPointerDown,
		}),
		[
			value,
			onChange,
			onSubmit,
			loading,
			disabled,
			resolvedCanSubmit,
			onStop,
			onPaste,
			textareaRef,
			syncTextareaHeight,
			onShellPointerDown,
		]
	);

	return (
		<ChatInputContext.Provider value={contextValue}>
			<div className={cn("relative z-10 mx-auto w-full max-w-3xl", containerClassName, className)}>
				<div
					className='relative z-10 flex w-full cursor-text flex-col overflow-hidden rounded-3xl bg-card shadow-chat-input'
					onPointerDown={onShellPointerDown}
				>
					<div className='flex flex-col'>{children}</div>
				</div>
			</div>
		</ChatInputContext.Provider>
	);
};

ChatInput.displayName = "ChatInput";

type ChatInputAttachmentsProps = {
	children: React.ReactNode;
	className?: string;
};

export const ChatInputAttachments = ({ children, className }: ChatInputAttachmentsProps) => {
	return (
		<div className={cn("overflow-hidden", className)}>
			<div className='px-4 pt-4 pb-2'>
				<div className='flex flex-col gap-2'>
					<div
						className='-mt-2 -ms-2 flex max-w-full flex-row gap-3 overflow-x-auto pt-2 pb-px ps-2 scrollbar-none [&::-webkit-scrollbar]:hidden'
						data-composer-attachment
					>
						{children}
					</div>
				</div>
			</div>
		</div>
	);
};

ChatInputAttachments.displayName = "ChatInputAttachments";

type ChatInputBodyProps = {
	children: React.ReactNode;
	className?: string;
};

export const ChatInputBody = ({ children, className }: ChatInputBodyProps) => {
	return <div className={cn("flex flex-col gap-1 p-4 pb-2", className)}>{children}</div>;
};

ChatInputBody.displayName = "ChatInputBody";

type ChatInputTextAreaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">;

export const ChatInputTextArea = ({ className, placeholder, ...props }: ChatInputTextAreaProps) => {
	const t = useTranslations("components.chat.chatInput");
	const { value, onChange, onSubmit, isDisabled, canSubmit, onPaste, textareaRef, syncTextareaHeight } =
		useChatInputContext();

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (event.key !== "Enter" || event.shiftKey || !canSubmit) {
				return;
			}
			event.preventDefault();
			onSubmit();
		},
		[canSubmit, onSubmit]
	);

	return (
		<div className='relative'>
			<textarea
				aria-label={t("writePrompt")}
				className={cn(
					"wrap-break-word max-h-96 min-h-8 w-full resize-none overflow-y-auto bg-transparent px-1 text-base text-foreground leading-6 outline-none",
					"placeholder:text-muted-foreground",
					className
				)}
				disabled={isDisabled}
				onChange={(event) => {
					onChange(event);
					syncTextareaHeight();
				}}
				onInput={syncTextareaHeight}
				onKeyDown={handleKeyDown}
				onPaste={onPaste}
				placeholder={placeholder ?? t("placeholder")}
				ref={textareaRef}
				rows={1}
				spellCheck={false}
				value={value}
				{...props}
			/>
		</div>
	);
};

ChatInputTextArea.displayName = "ChatInputTextArea";

type ChatInputControlsProps = {
	children: React.ReactNode;
	className?: string;
};

export const ChatInputControls = ({ children, className }: ChatInputControlsProps) => {
	return <div className={cn("relative flex w-full items-center justify-between gap-2", className)}>{children}</div>;
};

ChatInputControls.displayName = "ChatInputControls";

type ChatInputSubmitProps = Omit<React.ComponentProps<typeof Button>, "onClick">;

export const ChatInputSubmit = ({ className, ...props }: ChatInputSubmitProps) => {
	const t = useTranslations("components.chat.input");
	const { onSubmit, isLoading, isDisabled, canSubmit, onStop } = useChatInputContext();

	if (isLoading && onStop) {
		return (
			<Button
				type='button'
				size='icon'
				variant='secondary'
				onClick={onStop}
				aria-label={t("stop")}
				className={cn("h-fit shrink-0 rounded-full p-1.5!", className)}
				{...props}
			>
				<SquareIcon className='size-4 fill-current' />
			</Button>
		);
	}

	return (
		<Button
			type='button'
			size='icon'
			disabled={isDisabled || !canSubmit}
			onClick={(event) => {
				event.preventDefault();
				if (canSubmit) {
					onSubmit();
				}
			}}
			aria-label={t("send")}
			className={cn("h-fit shrink-0 rounded-full p-1.5!", className)}
			{...props}
		>
			<ArrowUpIcon className='size-4' />
		</Button>
	);
};

ChatInputSubmit.displayName = "ChatInputSubmit";
