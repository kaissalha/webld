"use client";

import { LayoutGroup, motion } from "motion/react";

import { ChatComposer } from "@/components/chat/chat-input/chat-composer";
import { ChatMessageList } from "@/components/chat/message/chat-message-list";

const inputVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: { opacity: 1, y: 0 },
};

const inputTransition = { type: "spring", stiffness: 300, damping: 25 } as const;

export const ChatContent = () => {
	return (
		<div className='relative flex h-full min-h-0 w-full flex-col items-center overflow-hidden'>
			<LayoutGroup id='chat-content-input'>
				<ChatMessageList className='w-full' />
				<motion.div
					layoutId='chat-input'
					className='absolute inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4'
					variants={inputVariants}
					initial='hidden'
					animate='visible'
					transition={inputTransition}
				>
					<ChatComposer containerClassName='w-full max-w-3xl' />
				</motion.div>
			</LayoutGroup>
			<div className='pointer-events-none absolute inset-x-0 bottom-0 z-30 h-30 bg-linear-to-t from-background to-transparent' />
		</div>
	);
};

ChatContent.displayName = "ChatContent";
