"use client";

import { createContext, useCallback, useContext, useImperativeHandle } from "react";

import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useTextareaResize } from "@/hooks/use-textarea-resize";
import { Button } from "@starter/ui/components/button";
import { Textarea } from "@starter/ui/components/textarea";
import { cn } from "@starter/ui/lib/utils";

type ChatInputContextValue = {
	value: string;
	onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
	onSubmit: () => void;
	isLoading: boolean;
	isDisabled: boolean;
	canSubmit: boolean;
	onStop?: () => void;
	variant: "default" | "unstyled";
	rows: number;
};

const ChatInputContext = createContext<ChatInputContextValue | null>(null);

const useChatInputContext = () => {
	const context = useContext(ChatInputContext);
	if (!context) {
		throw new Error("ChatInput components must be used within ChatInput");
	}
	return context;
};

type ChatInputProps = {
	children: React.ReactNode;
	className?: string;
	variant?: "default" | "unstyled";
	value: string;
	onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
	onSubmit: () => void;
	loading?: boolean;
	disabled?: boolean;
	canSubmit?: boolean;
	onStop?: () => void;
	rows?: number;
};

const ChatInput = ({
	children,
	className,
	variant = "default",
	value,
	onChange,
	onSubmit,
	loading = false,
	disabled = false,
	canSubmit,
	onStop,
	rows = 1,
}: ChatInputProps) => {
	const resolvedCanSubmit = canSubmit ?? Boolean(value.trim());
	const contextValue: ChatInputContextValue = {
		value,
		onChange,
		onSubmit,
		isLoading: loading,
		isDisabled: disabled || loading,
		canSubmit: resolvedCanSubmit,
		onStop,
		variant,
		rows,
	};

	return (
		<ChatInputContext.Provider value={contextValue}>
			<div
				className={cn(
					variant === "default" &&
						"relative z-10 flex w-full items-center rounded-lg border border-input bg-background bg-clip-padding text-base/5 transition-[color,background-color,box-shadow,border-color] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] not-has-[textarea:disabled]:before:shadow-sm has-[textarea:disabled]:opacity-64 sm:text-sm dark:bg-input/32 dark:bg-clip-border dark:shadow-black/24 dark:not-has-[textarea:disabled]:shadow-sm dark:not-has-[textarea:disabled]:before:shadow-[0_-1px_--theme(--color-white/8%)]",
					variant === "unstyled" && "flex w-full items-start gap-2",
					className
				)}
			>
				{children}
			</div>
		</ChatInputContext.Provider>
	);
};

ChatInput.displayName = "ChatInput";

type ChatInputTextAreaProps = Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange"> & {
	ref?: React.Ref<HTMLTextAreaElement>;
};

const ChatInputTextArea = ({ className, ref, ...props }: ChatInputTextAreaProps) => {
	const { value, onChange, onSubmit, isDisabled, rows, canSubmit } = useChatInputContext();
	const { textareaRef } = useTextareaResize(value, rows);

	useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement, [textareaRef]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				if (!canSubmit) {
					return;
				}
				e.preventDefault();
				onSubmit();
			}
		},
		[canSubmit, onSubmit]
	);

	return (
		<Textarea
			ref={textareaRef}
			size='sm'
			value={value}
			onChange={onChange}
			onKeyDown={handleKeyDown}
			disabled={isDisabled}
			rows={rows}
			autoComplete='off'
			className={cn(
				"not-placeholder-shown:text-foreground max-h-100 min-h-0 flex-1 resize-none overflow-x-hidden border-0 bg-transparent px-1 text-base font-normal ring-0 transition-none placeholder:text-base placeholder:font-normal placeholder:text-muted-foreground hover:ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 md:text-base!",
				className
			)}
			{...props}
		/>
	);
};

ChatInputTextArea.displayName = "ChatInputTextArea";

type ChatInputSubmitProps = Omit<React.ComponentProps<typeof Button>, "onClick">;

const ChatInputSubmit = ({ className, ...props }: ChatInputSubmitProps) => {
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
			onClick={(e) => {
				e.preventDefault();
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

export { ChatInput, ChatInputTextArea, ChatInputSubmit };
