"use client";

import type * as React from "react";

import { Paperclip } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@webld/ui/lib/utils";

type ChatPlusMenuProps = {
	disabled?: boolean;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
};

export const ChatPlusMenu = ({ disabled = false, fileInputRef }: ChatPlusMenuProps) => {
	const t = useTranslations("components.chat.chatInput.plusMenu");

	return (
		<button
			aria-label={t("addFiles")}
			className={cn(
				"relative isolate inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg",
				"text-muted-foreground outline-none",
				"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
				"disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
			)}
			disabled={disabled}
			onClick={() => fileInputRef.current?.click()}
			type='button'
		>
			<Paperclip aria-hidden className='size-4.5 shrink-0 text-muted-foreground' strokeWidth={1.25} />
		</button>
	);
};
