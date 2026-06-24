"use client";

import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@webld/ui/components/button";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@webld/ui/components/tooltip";

export const ChatNewChatButton = ({ onClick }: { onClick: () => void }) => {
	const t = useTranslations("chats");
	const label = t("newChat");

	return (
		<TooltipProvider delay={0}>
			<Tooltip>
				<TooltipTrigger
					delay={0}
					render={<Button type='button' variant='ghost' size='icon' onClick={onClick} aria-label={label} />}
				>
					<PlusIcon className='size-4' aria-hidden />
				</TooltipTrigger>
				<TooltipPopup>{label}</TooltipPopup>
			</Tooltip>
		</TooltipProvider>
	);
};
