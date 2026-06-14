import { z } from "zod";

export const PaginationSchema = z.object({
	pageSize: z.number().optional(),
	cursor: z.string().nullable().optional(),
	sort: z.string().optional(),
	order: z.enum(["asc", "desc"]).optional(),
});

export type PaginationProps = z.infer<typeof PaginationSchema>;

export type PaginatedData<T> = {
	data: T[];
	cursor: string | null;
	totalPages: number;
	totalData: number;
};
