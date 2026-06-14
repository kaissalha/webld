export const hasTransparentPixels = async (buffer: Buffer): Promise<boolean> => {
	const sharp = (await import("sharp")).default;
	const stats = await sharp(buffer).stats();
	return stats.isOpaque === false;
};

const LOGO_PADDING_PX = 6;

export const trimAndPadTransparentImage = async ({
	buffer,
	paddingPx = LOGO_PADDING_PX,
}: {
	buffer: Buffer;
	paddingPx?: number;
}): Promise<Buffer> => {
	const sharp = (await import("sharp")).default;

	return sharp(buffer)
		.trim()
		.extend({
			top: paddingPx,
			bottom: paddingPx,
			left: paddingPx,
			right: paddingPx,
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		})
		.png()
		.toBuffer();
};
