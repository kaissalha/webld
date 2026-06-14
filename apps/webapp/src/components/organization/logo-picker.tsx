"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { ImageIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@starter/ui/components/avatar";
import { Button } from "@starter/ui/components/button";
import { cn } from "@starter/ui/lib/utils";

type LogoPickerProps = {
	accept?: string;
	className?: string;
	disabled?: boolean;
	fallback?: React.ReactNode;
	isUploading?: boolean;
	maxSizeMb?: number;
	name?: string;
	onFileSelect: ({ file, previewUrl }: { file: File; previewUrl: string }) => void | Promise<void>;
	onRemove?: () => void | Promise<void>;
	previewUrl: string | null;
	size?: "md" | "lg";
};

const DEFAULT_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";

export const LogoPicker = ({
	accept = DEFAULT_ACCEPT,
	className,
	disabled,
	fallback,
	isUploading = false,
	maxSizeMb,
	name,
	onFileSelect,
	onRemove,
	previewUrl,
	size = "lg",
}: LogoPickerProps) => {
	const t = useTranslations("organizationLogo");
	const inputRef = useRef<HTMLInputElement>(null);
	const inputId = useId();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!previewUrl && inputRef.current) {
			inputRef.current.value = "";
		}
	}, [previewUrl]);

	const handleBrowse = useCallback(() => {
		if (disabled || isUploading) return;
		inputRef.current?.click();
	}, [disabled, isUploading]);

	const handleChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) return;

			if (maxSizeMb) {
				const maxBytes = maxSizeMb * 1024 * 1024;
				if (file.size > maxBytes) {
					setError(t("errors.tooLarge", { size: maxSizeMb }));
					event.target.value = "";
					return;
				}
			}

			setError(null);
			const objectUrl = URL.createObjectURL(file);
			void onFileSelect({ file, previewUrl: objectUrl });
		},
		[maxSizeMb, onFileSelect, t]
	);

	const handleRemove = useCallback(async () => {
		if (!onRemove) return;
		setError(null);
		if (inputRef.current) inputRef.current.value = "";
		await onRemove();
	}, [onRemove]);

	const avatarSize = size === "lg" ? "size-20" : "size-16";
	const displayName = name?.trim() || "";
	const initials =
		displayName
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((segment) => segment[0]?.toUpperCase() ?? "")
			.join("") || "";

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			<div className='flex items-center gap-4'>
				<Avatar className={cn(avatarSize, "rounded-lg border border-border bg-muted/40")}>
					{previewUrl ? <AvatarImage src={previewUrl} alt={displayName || t("altFallback")} /> : null}
					<AvatarFallback className='rounded-lg bg-muted/40 text-muted-foreground'>
						{fallback ?? (initials ? initials : <ImageIcon className='size-5' />)}
					</AvatarFallback>
				</Avatar>

				<div className='flex flex-wrap items-center gap-2'>
					<Button
						type='button'
						variant='outline'
						size='sm'
						onClick={handleBrowse}
						disabled={disabled}
						loading={isUploading}
					>
						<UploadIcon className='size-4' />
						{previewUrl ? t("actions.replace") : t("actions.upload")}
					</Button>
					{previewUrl && onRemove ? (
						<Button
							type='button'
							variant='ghost'
							size='sm'
							onClick={() => void handleRemove()}
							disabled={disabled || isUploading}
							className='text-muted-foreground hover:text-destructive'
						>
							<Trash2Icon className='size-4' />
							{t("actions.remove")}
						</Button>
					) : null}
				</div>
			</div>

			<input
				ref={inputRef}
				id={inputId}
				type='file'
				accept={accept}
				className='hidden'
				onChange={handleChange}
				disabled={disabled || isUploading}
			/>

			{error ? <p className='text-sm text-destructive'>{error}</p> : null}
		</div>
	);
};
