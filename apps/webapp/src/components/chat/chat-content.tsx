"use client";

import { LayoutGroup, motion } from "motion/react";

import { ChatComposer } from "@/components/chat/chat-input/chat-composer";
import { ChatMessageList } from "@/components/chat/message/chat-message-list";

export const ChatContent = () => {
	return (
		<div className='relative flex h-full min-h-0 w-full flex-col items-center overflow-hidden'>
			<LayoutGroup id='chat-content-input'>
				<ChatMessageList className='w-full' />
				<motion.div
					layoutId='chat-input'
					className='absolute inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4'
				>
					<ChatComposer containerClassName='w-full max-w-3xl' />
				</motion.div>
			</LayoutGroup>
			<div className='pointer-events-none absolute inset-x-0 bottom-0 z-30 h-30 bg-linear-to-t from-background to-transparent' />
		</div>
	);
};

ChatContent.displayName = "ChatContent";
