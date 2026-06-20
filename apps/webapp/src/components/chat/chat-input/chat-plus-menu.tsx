"use client";

import type * as React from "react";

import {
	Archive,
	Blocks,
	BriefcaseBusiness,
	Camera,
	Check,
	Feather,
	Globe2,
	Paperclip,
	Plus,
	Search,
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@webld/ui/components/dropdown-menu";
import { cn } from "@webld/ui/lib/utils";

const GitHubIcon = () => {
	return (
		<svg aria-hidden className='size-5' fill='currentColor' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'>
			<title>GitHub</title>
			<path
				clipRule='evenodd'
				d='M8.005 1.4C4.353 1.4 1.4 4.425 1.4 8.167c0 2.991 1.892 5.524 4.517 6.42.328.068.448-.145.448-.325 0-.157-.011-.694-.011-1.255-1.837.404-2.22-.806-2.22-.806-.295-.785-.733-.986-.733-.986-.601-.415.044-.415.044-.415.667.045 1.017.695 1.017.695.591 1.03 1.542.74 1.925.56.054-.437.23-.74.415-.907-1.465-.157-3.007-.74-3.007-3.339 0-.74.262-1.345.678-1.815-.066-.168-.295-.863.066-1.793 0 0 .557-.18 1.815.695a6.2 6.2 0 0 1 1.651-.224c.558 0 1.126.078 1.651.224 1.258-.875 1.816-.695 1.816-.695.36.93.131 1.625.065 1.793.427.47.678 1.075.678 1.815 0 2.599-1.542 3.17-3.018 3.339.24.213.448.616.448 1.254 0 .908-.011 1.636-.011 1.86 0 .18.12.393.448.325 2.625-.896 4.517-3.428 4.517-6.42C14.611 4.425 11.647 1.4 8.005 1.4Z'
				fillRule='evenodd'
			/>
		</svg>
	);
};

const composerMenuItemClass = cn(
	"group relative flex min-h-8 cursor-pointer items-center justify-between gap-4 rounded-lg px-2 py-1.5 text-sm outline-none",
	"duration-150 ease-out [transition-property:background-color,color]",
	"focus:bg-muted/80 focus:text-foreground data-open:bg-muted/80 data-popup-open:bg-muted/80",
	"data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50"
);

const composerSubContentClass = cn("min-w-52 rounded-xl border border-border/70 bg-card p-1.5 shadow-md ring-0");

type ComposerMenuRowProps = {
	icon: React.ReactNode;
	label: string;
	shortcut?: string;
	checked?: boolean;
};

const ComposerMenuRow = ({ icon, label, shortcut, checked }: ComposerMenuRowProps) => {
	return (
		<>
			<div className='flex min-w-0 items-center gap-2'>
				<span className='flex size-5 shrink-0 items-center justify-center text-foreground'>{icon}</span>
				<span className='min-w-0 flex-1 truncate'>{label}</span>
			</div>
			{checked ? (
				<Check aria-hidden className='size-4 shrink-0 text-info' />
			) : shortcut ? (
				<span className='min-w-0 shrink truncate text-end text-muted-foreground text-xs opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100'>
					{shortcut}
				</span>
			) : null}
		</>
	);
};

type ChatPlusMenuProps = {
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onOpenChange: (open: boolean) => void;
	open: boolean;
};

export const ChatPlusMenu = ({ fileInputRef, onOpenChange, open }: ChatPlusMenuProps) => {
	const t = useTranslations("components.chat.chatInput.plusMenu");

	return (
		<DropdownMenu onOpenChange={onOpenChange} open={open}>
			<DropdownMenuTrigger asChild>
				<button
					aria-expanded={open}
					aria-haspopup='menu'
					aria-label={t("aria")}
					className={cn(
						"relative isolate inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-muted/80",
						"text-muted-foreground outline-none",
						"duration-200 ease-[var(--ease-out-quint)]",
						"[transition-property:background-color,transform,color]",
						"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card data-popup-open:bg-muted/80",
						"active:scale-[0.96] motion-reduce:active:scale-100"
					)}
					type='button'
				>
					<Plus aria-hidden className='size-5 shrink-0' strokeWidth={1.5} />
				</button>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align='start'
				className={cn(
					"min-w-48 max-w-80 rounded-xl border border-border/70 bg-card p-1.5 text-foreground shadow-md ring-0",
					"max-h-[min(var(--available-height),24rem)] overflow-y-auto"
				)}
				side='bottom'
				sideOffset={8}
			>
				<DropdownMenuItem className={composerMenuItemClass} onClick={() => fileInputRef.current?.click()}>
					<ComposerMenuRow
						icon={<Paperclip aria-hidden className='size-5' strokeWidth={1.75} />}
						label={t("addFiles")}
						shortcut='⌘U'
					/>
				</DropdownMenuItem>
				<DropdownMenuItem className={composerMenuItemClass} disabled>
					<ComposerMenuRow
						icon={<Camera aria-hidden className='size-5' strokeWidth={1.75} />}
						label={t("screenshot")}
					/>
				</DropdownMenuItem>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger className={composerMenuItemClass} disabled>
						<ComposerMenuRow
							icon={<Archive aria-hidden className='size-5' strokeWidth={1.75} />}
							label={t("addToProject")}
						/>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent className={composerSubContentClass}>
						<DropdownMenuItem className={composerMenuItemClass} disabled>
							<ComposerMenuRow
								icon={<BriefcaseBusiness aria-hidden className='size-5' strokeWidth={1.75} />}
								label={t("currentProject")}
							/>
						</DropdownMenuItem>
						<DropdownMenuItem className={composerMenuItemClass} disabled>
							<ComposerMenuRow
								icon={<Plus aria-hidden className='size-5' strokeWidth={1.75} />}
								label={t("createProject")}
							/>
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuItem className={composerMenuItemClass} disabled>
					<ComposerMenuRow icon={<GitHubIcon />} label={t("addFromGitHub")} />
				</DropdownMenuItem>

				<DropdownMenuSeparator className='mx-2 my-1.5 h-px bg-border/70' />

				<DropdownMenuSub>
					<DropdownMenuSubTrigger className={composerMenuItemClass} disabled>
						<ComposerMenuRow
							icon={<Archive aria-hidden className='size-5' strokeWidth={1.75} />}
							label={t("skills")}
						/>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent className={composerSubContentClass}>
						<DropdownMenuItem className={composerMenuItemClass} disabled>
							<ComposerMenuRow
								icon={<Feather aria-hidden className='size-5' strokeWidth={1.75} />}
								label={t("skillCreator")}
							/>
						</DropdownMenuItem>
						<DropdownMenuSeparator className='mx-2 my-1.5 h-px bg-border/70' />
						<DropdownMenuItem className={composerMenuItemClass} disabled>
							<ComposerMenuRow
								icon={<BriefcaseBusiness aria-hidden className='size-5' strokeWidth={1.75} />}
								label={t("manageSkills")}
							/>
						</DropdownMenuItem>
						<DropdownMenuItem className={composerMenuItemClass} disabled>
							<ComposerMenuRow
								icon={<Plus aria-hidden className='size-5' strokeWidth={1.75} />}
								label={t("addSkill")}
							/>
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuItem className={composerMenuItemClass} disabled>
					<ComposerMenuRow
						icon={<Blocks aria-hidden className='size-5' strokeWidth={1.75} />}
						label={t("addConnectors")}
					/>
				</DropdownMenuItem>

				<DropdownMenuSeparator className='mx-2 my-1.5 h-px bg-border/70' />

				<DropdownMenuCheckboxItem checked={false} className={composerMenuItemClass} disabled>
					<ComposerMenuRow
						icon={<Search aria-hidden className='size-5' strokeWidth={1.75} />}
						label={t("research")}
					/>
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem checked={false} className={composerMenuItemClass} disabled>
					<ComposerMenuRow
						icon={<Globe2 aria-hidden className='size-5' strokeWidth={1.75} />}
						label={t("webSearch")}
					/>
				</DropdownMenuCheckboxItem>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger className={composerMenuItemClass} disabled>
						<ComposerMenuRow
							icon={<Feather aria-hidden className='size-5' strokeWidth={1.75} />}
							label={t("useStyle")}
						/>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent className={composerSubContentClass}>
						<DropdownMenuItem className={composerMenuItemClass} disabled>
							<ComposerMenuRow
								icon={<Feather aria-hidden className='size-5' strokeWidth={1.75} />}
								label={t("concise")}
							/>
						</DropdownMenuItem>
						<DropdownMenuItem className={composerMenuItemClass} disabled>
							<ComposerMenuRow
								icon={<Feather aria-hidden className='size-5' strokeWidth={1.75} />}
								label={t("explanatory")}
							/>
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
