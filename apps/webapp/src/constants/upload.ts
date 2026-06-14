export const DEFAULT_MAX_UPLOAD_FILE_SIZE_MB = 50;

export const mediaAccessValues = ["public", "private"] as const;

export type MediaAccess = (typeof mediaAccessValues)[number];
