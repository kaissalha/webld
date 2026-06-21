"use client";

import type React from "react";

import { LayoutGroup, motion } from "motion/react";

import { ChatComposer } from "@/components/chat/chat-input/chat-composer";
import { ChatMessageList } from "@/components/chat/message/chat-message-list";

export type ChatContentProps = {
	emptyState?: React.ReactNode;
	inputActions?: React.ReactNode;
	placeholder?: string;
};

export const ChatContent = ({ emptyState, inputActions, placeholder }: ChatContentProps) => {
	return (
		<div className='relative flex h-full w-full flex-col items-center overflow-hidden'>
			<LayoutGroup id='chat-content-input'>
				<ChatMessageList emptyState={emptyState} />
				<motion.div
					layoutId='chat-input'
					className='absolute inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4'
					variants={{
						hidden: { opacity: 0, y: 20 },
						visible: { opacity: 1, y: 0 },
					}}
					initial='hidden'
					animate='visible'
					transition={{ type: "spring", stiffness: 300, damping: 25 }}
				>
					<ChatComposer
						containerClassName='w-full max-w-3xl'
						inputActions={inputActions}
						placeholder={placeholder}
					/>
				</motion.div>
			</LayoutGroup>
			<div className='pointer-events-none absolute inset-x-0 bottom-0 z-30 h-30 bg-linear-to-t from-background to-transparent' />
		</div>
	);
};

ChatContent.displayName = "ChatContent";
