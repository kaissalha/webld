import { generateImage } from "ai";

import { removeImageBackgroundPrompt } from "@starter/ai/prompts";

type RemoveImageBackgroundParams = {
	buffer: Buffer;
};

type RemoveImageBackgroundResult = {
	base64: string;
	uint8Array: Uint8Array;
	mediaType: string;
};

export const removeImageBackground = async ({
	buffer,
}: RemoveImageBackgroundParams): Promise<RemoveImageBackgroundResult> => {
	const { image } = await generateImage({
		model: "openai/gpt-image-1.5",
		prompt: {
			text: removeImageBackgroundPrompt,
			images: [new Uint8Array(buffer)],
		},
		providerOptions: {
			openai: {
				background: "transparent",
				output_format: "png",
			},
		},
	});

	return {
		base64: image.base64,
		uint8Array: image.uint8Array,
		mediaType: image.mediaType,
	};
};
