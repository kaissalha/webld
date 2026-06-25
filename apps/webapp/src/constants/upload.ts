export const DEFAULT_MAX_UPLOAD_FILE_SIZE_MB = 50;

export const MAX_INGEST_FILE_SIZE_MB = 5;
export const MAX_INGEST_FILE_SIZE_BYTES = MAX_INGEST_FILE_SIZE_MB * 1024 * 1024;

export const mediaAccessValues = ["public", "private"] as const;

export type MediaAccess = (typeof mediaAccessValues)[number];
